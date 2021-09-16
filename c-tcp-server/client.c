#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <arpa/inet.h>
#include <errno.h>
#include <unistd.h>

#define PORT 8080
#define HOST "127.0.0.1"

int main(){
	int clientSocket;
	char buffer[1024];
	struct sockaddr_in serverAddr;
	socklen_t addr_size;

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

	// Send data
	strcpy(buffer, "Hello World\n");

	if(send(clientSocket, buffer, 13, 0) < 0) {
		printf("Failed to send data! (%i)\n", errno);
		return errno;
	}

	// Receive data
	bzero(buffer, sizeof(buffer));

	if(recv(clientSocket, buffer, 1024, 0) < 0) {
		printf("Failed to receive data! (%i)\n", errno);
		return errno;
	}

	printf("Data received: %s", buffer);

	// Close the socket
	if(close(clientSocket) < 0) {
		printf("Failed to close socket! (%i)\n", errno);
		return errno;
	}

	return 0;
}
