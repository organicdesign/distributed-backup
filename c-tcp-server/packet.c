#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef PACKET_C
#define PACKET_C

enum TransportType { KEY, DATA, QUERY };

const char* TransportTypeNames[] = { "Key", "Data", "Query" };

struct Packet {
	unsigned char type;
	unsigned int key;
	off64_t position;
	unsigned char* data;
};

struct Packet* createKeyPacket (unsigned int key, unsigned char* data) {
	struct Packet* p = (struct Packet*)malloc( sizeof( struct Packet ) );

	if (p) {
		p->type = KEY;
		p->key = key;
		p->data = data;
	}

	return p;
}

struct Packet* createDataPacket (unsigned int key, off64_t position, unsigned char* data) {
	struct Packet* p = (struct Packet*)malloc( sizeof( struct Packet ) );

	if (p) {
		p->type = DATA;
		p->key = key;
		p->position = position;
		p->data = data;
	}

	return p;
}

struct Packet* createQueryPacket (unsigned int key) {
	struct Packet* p = (struct Packet*)malloc( sizeof( struct Packet ) );

	if (p) {
		p->type = QUERY;
		p->key = key;
	}

	return p;
}

int getPacketSize (struct Packet* packet) {
	switch(packet->type) {
		case KEY:
			return
				sizeof(packet->type) +
				sizeof(packet->key) +
				strlen(packet->data);

		case DATA:
			return
				sizeof(packet->type) +
				sizeof(packet->key) +
				sizeof(packet->position) +
				strlen(packet->data);

		case QUERY:
			return
				sizeof(packet->type) +
				sizeof(packet->key);

		default:
			printf("Packet did not match any known types. Type: #%i", packet->type);
			return -1;
	}
}

int convertPacketToBuffer (unsigned char* buffer, struct Packet* packet, unsigned int bufferSize) {
	if (bufferSize < getPacketSize(packet)) {
		printf(
			"Buffer is too small:\n"
			"  Packet size: %i\n"
			"  Buffer size: %i\n",
			getPacketSize(packet),
			bufferSize
		);

		return -1;
	}
}

void printPacket (struct Packet* packet) {
	printf(
		"Packet:\n"
		"  Type:\t\t%s\n"
		"  Key:\t\t%u\n"
		"  Position:\t%li\n"
		"  Data:\t\t%s\n"
		"  Size:\t\t%i\n",
		TransportTypeNames[packet->type],
		packet->key,
		packet->position,
		packet->data,
		getPacketSize(packet)
	);
}

#endif
