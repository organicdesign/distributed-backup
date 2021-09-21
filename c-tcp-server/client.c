#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <arpa/inet.h>
#include <errno.h>
#include <openssl/sha.h>
#include <sys/stat.h>
#include "./packet.h"
#include "./storage.h"

#define PORT 8080
#define HOST "127.0.0.1"
#define PACKET_SIZE 64
#define STORAGE_FILE "./storage/test"

int main () {
	int clientSocket, bytesReceived, position = 0;
	struct Packet* packet;
	unsigned char buffer[PACKET_SIZE];
	unsigned char hash[SHA_DIGEST_LENGTH];
	struct sockaddr_in serverAddr;
	socklen_t addr_size;
	FILE *filePtr;
	// Keyfile is a path.
	char* keyfile, append[10];

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

	// Receive data
	bzero(buffer, sizeof(buffer));
	bytesReceived = recv(clientSocket, buffer, sizeof(buffer), 0);

	// Something went wrong revieving the data.
	if (bytesReceived < 0) {
		printf("Failed to receive data! (%i)\n", errno);
		return errno;
	}

	// Convert the data into a packet.
	packet = convertBufferToPacket(buffer, bytesReceived);

	if (packet == NULL) {
		printf("Failed to convert buffer into a packet!");
		return 1;
	}

	printPacket(packet);

	// Reserve enough bytes for 'STORAGE_FOLDER/key/<SOME_INT>'.
	keyfile = (char*)malloc(sizeof(char) * (strlen(STORAGE_FOLDER) + strlen("/key/") + sizeof(append)));
	snprintf(append, sizeof(append), "%i", packet->key);
	strcat(keyfile, STORAGE_FOLDER);
	strcat(keyfile, "/key/");
	strcat(keyfile, append);

	filePtr = openFileCreatingPath(keyfile);

	// Write to file
	if (writeSection(packet->data, filePtr, strlen(packet->data), 0) < 0) {
		printf("Failed to write to file! (%i)\n", errno);
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
		packet = convertBufferToPacket(buffer, bytesReceived);

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
