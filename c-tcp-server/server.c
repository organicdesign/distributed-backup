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
	int welcomeSocket, newSocket;
	char buffer[1024];
	struct sockaddr_in serverAddr;
	struct sockaddr_storage serverStorage;
	socklen_t addr_size;

	// Create the socket with: internet domain, stream socket and TCP
	welcomeSocket = socket(PF_INET, SOCK_STREAM, 0);

	/*---- Configure settings of the server address struct ----*/
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

	// Receive data
	if(recv(newSocket, buffer, 1024, 0) < 0) {
		printf("Failed to receive data! (%i)\n", errno);
		return errno;
	}

	printf("Data received: %s",buffer);

	// Send data
	bzero(buffer, sizeof(buffer));
	strcpy(buffer,"Hello World\n");

	if(send(newSocket, buffer, 13, 0) < 0) {
		printf("Failed to send data! (%i)\n", errno);
		return errno;
	}

	// Close the sockets
	if(close(welcomeSocket) < 0) {
		printf("Failed to close welcomeSocket! (%i)\n", errno);
		return errno;
	}

	if(close(newSocket) < 0) {
		printf("Failed to close newSocket! (%i)\n", errno);
		return errno;
	}

	return 0;
}
