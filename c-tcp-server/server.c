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

	/*---- Create the socket. The three arguments are: ----*/
	/* 1) Internet domain 2) Stream socket 3) Default protocol (TCP in this case) */
	welcomeSocket = socket(PF_INET, SOCK_STREAM, 0);

	/*---- Configure settings of the server address struct ----*/
	/* Address family = Internet */
	serverAddr.sin_family = AF_INET;
	/* Set port number, using htons function to use proper byte order */
	serverAddr.sin_port = htons(PORT);
	/* Set IP address to localhost */
	serverAddr.sin_addr.s_addr = inet_addr(HOST);
	/* Set all bits of the padding field to 0 */
	memset(serverAddr.sin_zero, '\0', sizeof serverAddr.sin_zero);

	/*---- Bind the address struct to the socket ----*/
	const int trueFlag = 1;
	if (setsockopt(welcomeSocket, SOL_SOCKET, SO_REUSEADDR, &trueFlag, sizeof(int)) < 0) {
		printf("Socket option error! (%i)\n", errno);
		return errno;
	}

	if (bind(welcomeSocket, (struct sockaddr *) &serverAddr, sizeof(serverAddr)) < 0) {
		printf("Bind error! (%i)\n", errno);
		return errno;
	}

	/*---- Listen on the socket, with 5 max connection requests queued ----*/
	if(listen(welcomeSocket, 5) < 0) {
		printf("Listen error! (%i)\n", errno);
		return errno;
	}

	/*---- Accept call creates a new socket for the incoming connection ----*/
	addr_size = sizeof serverStorage;
	newSocket = accept(welcomeSocket, (struct sockaddr *) &serverStorage, &addr_size);

	if(recv(newSocket, buffer, 1024, 0) < 0) {
		printf("Failed to receive data! (%i)\n", errno);
		return errno;
	}

	printf("Data received: %s",buffer);

	/*---- Send message to the socket of the incoming connection ----*/
	bzero(buffer, sizeof(buffer));
	strcpy(buffer,"Hello World\n");

	if(send(newSocket, buffer, 13, 0) < 0) {
		printf("Failed to send data! (%i)\n", errno);
		return errno;
	}

	close(welcomeSocket);
	close(newSocket);

	return 0;
}
