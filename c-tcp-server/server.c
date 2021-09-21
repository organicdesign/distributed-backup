#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <arpa/inet.h>
#include <errno.h>
#include <openssl/sha.h>
#include "./packet.h"
#include "./storage.h"

#define PORT 8080
#define HOST "127.0.0.1"
#define PACKET_SIZE 64
#define FILE_PATH "./server.c"

int main () {
	int welcomeSocket, newSocket, bytesRead, i, fileSize, position = 0;
	struct Packet* packet;
	unsigned char buffer[PACKET_SIZE];
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

	// Get filesize
	fileSize = getFileSize(filePtr);

	if (fileSize < 0) {
		printf("Failed to get file size. (%i)\n", errno);
		return 1;
	}

	packet = createKeyPacket(1234, FILE_PATH);

	if (convertPacketToBuffer(buffer, packet, sizeof(buffer)) < 0) {
		printf("Failed to convert packet to buffer!\n");
		return 1;
	}

	if (send(newSocket, buffer, calculatePacketSize(packet), 0) < 0) {
		printf("Failed to send key! (%i)\n", errno);
		return errno;
	}

	for (;;) {
		// Display progress
		printf("\rSent: %i%%", (int)((double)position * 100 / fileSize));
		fflush(stdout);

		// Read data
		bzero(buffer, sizeof(buffer));

		// Read the amount of bytes minus the packet overhead into the buffer.
		bytesRead = readSection(
			buffer,
			filePtr,
			sizeof(buffer) - calculatePacketOverhead(DATA),
			position
		);

		if (bytesRead < 0) {
			printf("Failed to read section! (%i)\n", errno);
			return errno;
		}

		if (bytesRead == 0)
			break;

		// Create the packet from the data.
		packet = createDataPacket(1234, position, buffer);

		position += bytesRead;

		// Calculate hash
		SHA1(packet->data, strlen(packet->data), hash);

		if (convertPacketToBuffer(buffer, packet, sizeof(buffer)) < 0) {
			printf("Failed to convert packet to buffer!\n");
			return 1;
		}

		// Send data
		if (send(newSocket, buffer, calculatePacketSize(packet), 0) < 0) {
			printf("Failed to send data! (%i)\n", errno);
			return errno;
		}

		// Receive hash
		if (recv(newSocket, buffer, SHA_DIGEST_LENGTH, 0) < 0) {
			printf("Failed to receive data! (%i)\n", errno);
			return errno;
		}

		if (memcmp(hash, buffer, SHA_DIGEST_LENGTH) != 0) {
			printf("Hashes do not match!\n");
			return 1;
		}
	}

	printf("\n");

	// Flush and close file
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
