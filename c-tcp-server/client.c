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
#define STORAGE_FILE "./storage/test"

/**
 * Write to a section of a file.
 * @param[in]	buffer		The buffer in which to write bytes to the file from.
 * @param[in]	ptr			The pointer to the file to write to.
 * @param[in]	chunkSize	The number of bytes to write.
 * @param[in]	position	The number of bytes to skip before writing.
 *
 * @return The number of bytes written to the file, this should almost always
 * match chunkSize.
 */
int writeSection (unsigned char* buffer, FILE* ptr, int chunkSize, int position) {
	size_t writtenBytes;
	int i;

	// Seek through file
	if (fseek(ptr, position, SEEK_SET) < 0 ) {
		printf("Failed to seek file. (%i)\n", errno);
		return -1;
	}

	// Read file
	writtenBytes = fwrite(buffer, 1, chunkSize, ptr);

	if (ferror(ptr)) {
		printf("Failed to read file. (%i)\n", errno);
		return -1;
	}

	return writtenBytes;
}

int main () {
	int clientSocket, bytesReceived, position = 0;
	unsigned char buffer[CHUNK_SIZE];
	unsigned char hash[SHA_DIGEST_LENGTH];
	struct sockaddr_in serverAddr;
	socklen_t addr_size;
	FILE *filePtr;

	// Create the socket with: internet domain, stream socket and TCP
	clientSocket = socket(PF_INET, SOCK_STREAM, 0);

	// Address family = Internet
	serverAddr.sin_family = AF_INET;

	// Set port number
	serverAddr.sin_port = htons(PORT);

	// Set IP address to localhost
	serverAddr.sin_addr.s_addr = inet_addr(HOST);

	// Set all bits of the padding field to 0
	memset(serverAddr.sin_zero, '\0', sizeof serverAddr.sin_zero);

	// Connect the socket to the server using settings
	addr_size = sizeof serverAddr;

	if (connect(clientSocket, (struct sockaddr *) &serverAddr, addr_size) < 0) {
		printf("Connection error! (%i)\n", errno);
		return errno;
	}

	// Open file
	filePtr = fopen(STORAGE_FILE, "r+b");

	if (filePtr == NULL) {
		printf("Failed to open file. (%i)\n", errno);
		return errno;
	}

	for (;;) {
		// Receive data
		bzero(buffer, sizeof(buffer));
		bytesReceived = recv(clientSocket, buffer, sizeof(buffer), 0);

		if (bytesReceived < 0) {
			printf("Failed to receive data! (%i)\n", errno);
			return errno;
		}

		if (bytesReceived == 0)
			break;

		// Calculate hash
		SHA1(buffer, bytesReceived, hash);

		// Output
		printf("Bytes received: %i\n", bytesReceived);
		printf("Hash: ");

		// Display hash
		for(int i = 0; i < SHA_DIGEST_LENGTH; i++)
			printf("%02x", hash[i]);

		printf("\n");

		// Write to file
		if (writeSection(buffer, filePtr, bytesReceived, position) < 0) {
			printf("Failed to write to file! (%i)\n", errno);
			return errno;
		}

		position += bytesReceived;

		// Respond with hash
		if (send(clientSocket, hash, SHA_DIGEST_LENGTH, 0) < 0) {
			printf("Failed to send hash! (%i)\n", errno);
			return errno;
		}
	}

	// Flush and close file
	if (fflush(filePtr) != 0) {
		printf("Failed to flush file. (%i)\n", errno);
		return errno;
	}

	if (ftruncate(fileno(filePtr), position) != 0) {
		printf("Failed to truncate file. (%i)\n", errno);
		return errno;
	}

	if (fclose(filePtr) != 0) {
		printf("Failed to close file. (%i)\n", errno);
		return errno;
	}

	// Close the socket
	if (close(clientSocket) < 0) {
		printf("Failed to close socket! (%i)\n", errno);
		return errno;
	}

	return 0;
}
