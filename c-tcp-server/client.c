#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <arpa/inet.h>
#include <errno.h>
#include <unistd.h>
#include <openssl/sha.h>
#include "./packet.h"

#define PORT 8080
#define HOST "127.0.0.1"
#define PACKET_SIZE 64
#define STORAGE_FILE "./storage/test"

/**
 * Write to a section of a file.
 *
 * @param[in]	buffer		The buffer in which to write bytes to the file from.
 * @param[in]	ptr 		The pointer to the file to write to.
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

/**
 * Flush buffers to, truncate and close file.
 *
 * @param[in]	ptr 	The pointer to the file to close.
 * @param[in]	length	The size in bytes the file should be truncated to. Set
 * to -1 if it should not be truncated.
 *
 * @return If success returns 0, otherwise -1.
 */
int closeFile (FILE *ptr, int length) {
	int state = 0;

	if (fflush(ptr) != 0) {
		printf("Failed to flush file. (%i)\n", errno);
		state = -1;
	}

	if (length >= 0) {
		if (ftruncate(fileno(ptr), length) != 0) {
			printf("Failed to truncate file. (%i)\n", errno);
			state = -1;
		}
	}

	if (fclose(ptr) != 0) {
		printf("Failed to close file. (%i)\n", errno);
		state = -1;
	}

	return state;
}

/**
 * Open a file for reading and writing, creating it if it doesn't exist.
 *
 * @param[in]	path 	The path to the file to open.
 *
 * @return The file pointer if successful, otherwise NULL.
 */
FILE *openFile (char* path) {
	FILE *ptr = fopen(path, "r+b");

	if (ptr == NULL && errno != 2)
		return NULL;

	if (ptr == NULL) {
		ptr = fopen(path, "w");

		if (fclose(ptr) != 0) {
			printf("Failed to close file. (%i)\n", errno);
			return NULL;
		}

		ptr = fopen(path, "r+b");

		if (ptr == NULL) {
			printf("Failed to open file. (%i)\n", errno);
			return NULL;
		}
	}

	return ptr;
}

int main () {
	int clientSocket, bytesReceived, position = 0;
	struct Packet* packet;
	unsigned char buffer[PACKET_SIZE];
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
	filePtr = openFile(STORAGE_FILE);

	if (filePtr == NULL) {
		printf("Failed to open file. (%i)\n", errno);
		return errno;
	}

	for (;;) {
		// Give some indication of progress
		printf("\rWritten %i bytes.", position);
		fflush(stdout);

		// Receive data
		bzero(buffer, sizeof(buffer));
		bytesReceived = recv(clientSocket, buffer, sizeof(buffer), 0);

		// Something went wrong revieving the data.
		if (bytesReceived < 0) {
			printf("Failed to receive data! (%i)\n", errno);
			return errno;
		}

		// If we didn't receive anything break the loop.
		if (bytesReceived == 0)
			break;

		// Convert the data into a packet.
		packet = convertBufferToPacket(buffer);

		if (packet == NULL) {
			printf("Failed to convert buffer into a packet!");
			return 1;
		}

		// Write to file
		if (writeSection(packet->data, filePtr, strlen(packet->data), packet->position) < 0) {
			printf("Failed to write to file! (%i)\n", errno);
			return errno;
		}

		position += strlen(packet->data);

		// Calculate hash
		SHA1(packet->data, strlen(packet->data), hash);

		// Respond with hash
		if (send(clientSocket, hash, SHA_DIGEST_LENGTH, 0) < 0) {
			printf("Failed to send hash! (%i)\n", errno);
			return errno;
		}
	}

	printf("\n");

	// Close the file
	if (closeFile(filePtr, position) < 0) {
		printf("Failed to close file! (%i)\n", errno);
		return errno;
	}

	// Close the socket
	if (close(clientSocket) < 0) {
		printf("Failed to close socket! (%i)\n", errno);
		return errno;
	}

	return 0;
}
