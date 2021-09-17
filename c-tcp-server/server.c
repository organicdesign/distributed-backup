#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <arpa/inet.h>
#include <errno.h>
#include <unistd.h>
#include <openssl/sha.h>

#define PORT 8080
#define HOST "127.0.0.1"
#define CHUNK_SIZE 64
#define FILE_PATH "./server.c"

/**
 * Read a section of a file.
 * @param[out]	buffer		The buffer to write the bytes that will be read from
 * the file.
 * @param[in]	ptr 		The pointer to the file to read from.
 * @param[in]	chunkSize	The number of bytes to read.
 * @param[in]	position	The number of bytes to skip before reading.
 *
 * @return The number of bytes read from the file, this should always match
 * chunkSize with the exception of the last part of the file.
 */
int readSection (unsigned char* buffer, FILE* ptr, int chunkSize, int position) {
	size_t readBytes;
	int i;

	// Seek through file
	if (fseek(ptr, position, SEEK_SET) < 0 ) {
		printf("Failed to seek file. (%i)\n", errno);
		return -1;
	}

	// Read file
	readBytes = fread(buffer, 1, chunkSize, ptr);

	if (ferror(ptr)) {
		printf("Failed to read file. (%i)\n", errno);
		return -1;
	}

	return readBytes;
}

int main () {
	int welcomeSocket, newSocket, bytesRead, i, position = 0;
	unsigned char buffer[CHUNK_SIZE];
	unsigned char hash[SHA_DIGEST_LENGTH];
	FILE* filePtr;
	struct sockaddr_in serverAddr;
	struct sockaddr_storage serverStorage;
	socklen_t addr_size;

	// Create the socket with: internet domain, stream socket and TCP
	welcomeSocket = socket(PF_INET, SOCK_STREAM, 0);

	// Address family = Internet
	serverAddr.sin_family = AF_INET;
	// Set port number
	serverAddr.sin_port = htons(PORT);
	// Set IP address
	serverAddr.sin_addr.s_addr = inet_addr(HOST);
	// Set padding to 0
	memset(serverAddr.sin_zero, '\0', sizeof serverAddr.sin_zero);

	// Configure socket options
	const int trueFlag = 1;
	if (setsockopt(welcomeSocket, SOL_SOCKET, SO_REUSEADDR, &trueFlag, sizeof(int)) < 0) {
		printf("Socket option error! (%i)\n", errno);
		return errno;
	}

	// Bind settings to socket
	if (bind(welcomeSocket, (struct sockaddr *) &serverAddr, sizeof(serverAddr)) < 0) {
		printf("Bind error! (%i)\n", errno);
		return errno;
	}

	// Listen for connections with a backlog of 5
	if(listen(welcomeSocket, 5) < 0) {
		printf("Listen error! (%i)\n", errno);
		return errno;
	}

	// Accept new socket connections
	addr_size = sizeof serverStorage;
	newSocket = accept(welcomeSocket, (struct sockaddr *) &serverStorage, &addr_size);

	if (newSocket < 0) {
		printf("Failed accept socket! (%i)\n", errno);
		return errno;
	}

	// Open file
	filePtr = fopen(FILE_PATH, "rb");

	if (filePtr == NULL) {
		printf("Failed to open file. (%i)\n", errno);
		return -1;
	}

	for (;;) {
		// Read data
		bzero(buffer, sizeof(buffer));

		bytesRead = readSection(buffer, filePtr, sizeof(buffer), position);

		if (bytesRead < 0) {
			printf("Failed to read section! (%i)\n", errno);
			return errno;
		}

		if (bytesRead == 0)
			break;

		position += bytesRead;

		printf ("Bytes read %i\n", bytesRead);

		// Calculate hash
		SHA1(buffer, bytesRead, hash);

		// Display hash
		printf("Hash: ");

		for(i = 0; i < SHA_DIGEST_LENGTH;i++)
			printf("%02x", hash[i]);

		printf("\n");

		// Send data
		if (send(newSocket, buffer, bytesRead, 0) < 0) {
			printf("Failed to send data! (%i)\n", errno);
			return errno;
		}

		// Receive hash
		if (recv(newSocket, buffer, SHA_DIGEST_LENGTH, 0) < 0) {
			printf("Failed to receive data! (%i)\n", errno);
			return errno;
		}

		// Display received hash
		printf("Hash received: ");

		for(i = 0; i < SHA_DIGEST_LENGTH;i++)
			printf("%02x", buffer[i]);

		printf("\n");

		if (memcmp(hash, buffer, SHA_DIGEST_LENGTH) != 0) {
			printf("Hashes do not match!\n");
			return 1;
		}
	}

	// Flush and close file
	if (fflush(filePtr) != 0) {
		printf("Failed to flush file. (%i)\n", errno);
		return errno;
	}

	if (fclose(filePtr) != 0) {
		printf("Failed to close file. (%i)\n", errno);
		return -1;
	}

	// Close the sockets
	if (close(welcomeSocket) < 0) {
		printf("Failed to close welcomeSocket! (%i)\n", errno);
		return errno;
	}

	if (close(newSocket) < 0) {
		printf("Failed to close newSocket! (%i)\n", errno);
		return errno;
	}

	return 0;
}
