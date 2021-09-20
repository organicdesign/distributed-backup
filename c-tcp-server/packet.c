#include <stdio.h>
#include <stdlib.h>

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

void printPacket (struct Packet* packet) {
	printf(
		"Packet:\n"
		"  Type:\t\t%s\n"
		"  Key:\t\t%u\n"
		"  Position:\t%li\n"
		"  Data:\t\t%s\n",
		TransportTypeNames[packet->type],
		packet->key,
		packet->position,
		packet->data
	);
}

#endif
