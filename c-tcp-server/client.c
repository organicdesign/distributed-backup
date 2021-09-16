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

	/*---- Create the socket. The three arguments are: ----*/
	/* 1) Internet domain 2) Stream socket 3) Default protocol (TCP in this case) */
	clientSocket = socket(PF_INET, SOCK_STREAM, 0);

	/*---- Configure settings of the server address struct ----*/
	/* Address family = Internet */
	serverAddr.sin_family = AF_INET;
	/* Set port number, using htons function to use proper byte order */
	serverAddr.sin_port = htons(PORT);
	/* Set IP address to localhost */
	serverAddr.sin_addr.s_addr = inet_addr(HOST);
	/* Set all bits of the padding field to 0 */
	memset(serverAddr.sin_zero, '\0', sizeof serverAddr.sin_zero);

	/*---- Connect the socket to the server using the address struct ----*/
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

	/*---- Read the message from the server into the buffer ----*/
	bzero(buffer, sizeof(buffer));

	if(recv(clientSocket, buffer, 1024, 0) < 0) {
		printf("Failed to receive data! (%i)\n", errno);
		return errno;
	}

	/*---- Print the received message ----*/
	printf("Data received: %s", buffer);


	close(clientSocket);

	return 0;
}
