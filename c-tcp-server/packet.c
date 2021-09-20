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
	int i;

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

	bzero(buffer, bufferSize);

	// The first byte is the type
	buffer[0] = packet->type;

	// Load the 4 bytes that represent the key
	for (i = 0; i < 4; i++)
		buffer[1 + i] = packet->key >> 24 - i * 8;

	if (packet->type == QUERY)
		return 0;

	if (packet->type == KEY) {
		// Load the data
		for (i = 0; i < strlen(packet->data); i++)
			buffer[5 + i] = packet->data[i];

		return 0;
	}

	if (packet->type == DATA) {
		// Load the 8 bytes that represents position
		for (i = 0; i < 8; i++)
			buffer[5 + i] = packet->position >> 56 - i * 8;

		// Load the data
		for (i = 0; i < strlen(packet->data); i++)
			buffer[13 + i] = packet->data[i];

		return 0;
	}


	printf("Packet did not match any known types. Type: #%i", packet->type);
	return 1;
}

struct Packet* convertBufferToPacket(unsigned char* buffer, unsigned int bufferSize) {
	struct Packet* p = (struct Packet*)malloc( sizeof( struct Packet ) );
	int i, offset;

	if (!p)
		return p;

	// Get the type:
	p->type = buffer[0];

	// Get the key
	p->key = 0;

	for (i = 0; i < 4; i++)
		p->key += buffer[1 + i] << 24 - i * 8;

	if (p->type == QUERY)
		return p;

	if (p->type == KEY) {
		// Assign the data memory
		offset = 5;

		p->data = (unsigned char*)malloc( sizeof( unsigned char ) * (bufferSize - offset) );

		// Unload the data
		for (i = 0; i < bufferSize - offset; i++)
			p->data[i] = buffer[offset + i];

		return p;
	}

	if (p->type == DATA) {
		// Unload the 8 bytes that represents position
		p->position = 0;

		for (i = 0; i < 8; i++)
			p->position += buffer[5 + i] << 56 - i * 8;

		// Unload the data
		offset = 13;

		p->data = (unsigned char*)malloc( sizeof( unsigned char ) * (bufferSize - offset) );

		for (i = 0; i < bufferSize - offset; i++)
			p->data[i] = buffer[offset + i];

		return p;
	}

	return p;
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
