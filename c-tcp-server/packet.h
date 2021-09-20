/*
	@file
	@brief This file handles working with data packets.
*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef PACKET_H
#define PACKET_H

/// The values that represent the different packet types.
enum TransportType {
	/// KEY is a packet that requests assigning of a key.
	KEY,

	/// DATA is a packet for transfering file data.
	DATA,

	/// QUERY is a packet for querying information about the client's version of
	/// a file.
	QUERY
};

/// This array is for converting the TransportType's into strings.
const char* TransportTypeNames[] = { "Key", "Data", "Query" };

/// A packet is the structured format all data will follow between conversions
/// to a bufer.
struct Packet {
	/// A byte that represents the type of packet.
	unsigned char type;

	/// 4 bytes that represent the numerical key (which represnts a file).
	unsigned int key;

	/// 8 bytes that represent the position in the file represented by key.
	off64_t position;

	/// The byte array that holds the data contained in this packet.
	unsigned char* data;
};

/**
 * Create a KEY packet.
 *
 * @param[in]	key 	The file key.
 * @param[in]	data	The filename this key represents.
 *
 * @see Packet
 *
 * @return A Packet in the KEY format.
 */
struct Packet* createKeyPacket (unsigned int key, unsigned char* data) {
	struct Packet* p = (struct Packet*)malloc( sizeof( struct Packet ) );

	if (p) {
		p->type = KEY;
		p->key = key;
		p->data = data;
	}

	return p;
}

/**
 * Create a DATA packet.
 *
 * @param[in]	key 		The file key.
 * @param[in]	position	The position in the file.
 * @param[in]	data		The file data.
 *
 * @see Packet
 *
 * @return A Packet in the DATA format.
 */
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

/**
 * Create a QUERY packet.
 *
 * @param[in]	key 	The file key.
 *
 * @see Packet
 *
 * @return A Packet in the QUERY format.
 */
struct Packet* createQueryPacket (unsigned int key) {
	struct Packet* p = (struct Packet*)malloc( sizeof( struct Packet ) );

	if (p) {
		p->type = QUERY;
		p->key = key;
	}

	return p;
}

/**
 * Create the overhead size of a packet. This overhead is the size of the packet
 * without the byte array.
 *
 * @param[in]	packet 	The packet to calculate overhead for.
 *
 * @see Packet
 *
 * @return The size in bytes of the packet's overhead.
 */
int calculatePacketOverhead (struct Packet* packet) {
	switch(packet->type) {
		case KEY:
			return
				sizeof(packet->type) +
				sizeof(packet->key);

		case DATA:
			return
				sizeof(packet->type) +
				sizeof(packet->key) +
				sizeof(packet->position);

		case QUERY:
			return
				sizeof(packet->type) +
				sizeof(packet->key);

		default:
			printf("Packet did not match any known types. Type: #%i", packet->type);
			return -1;
	}
}

/**
 * Create the complete size of a packet. This is the sum of the overhead and the
 * size of the byte array.
 *
 * @param[in]	packet 	The packet to calculate size of.
 *
 * @see Packet
 *
 * @return The size in bytes of the packet.
 */
int calculatePacketSize (struct Packet* packet) {
	int overhead = calculatePacketOverhead(packet);

	switch(packet->type) {
		case KEY:
			return overhead + strlen(packet->data);

		case DATA:
			return overhead + strlen(packet->data);

		case QUERY:
			return overhead;
	}

	// If overhead calculation failed it will not match the above types so just
	// return it.
	return overhead;
}

/**
 * Convert a packet into a buffer. The buffer must be at least this size of the
 * packet.
 *
 * @param[out]	buffer		The buffer to load the packet data into.
 * @param[in]	packet		The packet to convert into a buffer.
 * @param[in]	bufferSize	The size of the buffer.
 *
 * @see Packet
 * @see calculatePacketOverhead()
 * @see calculatePacketSize()
 * @see convertBufferToPacket()
 *
 * @return If successful 0, otherwise -1.
 */
int convertPacketToBuffer (unsigned char* buffer, struct Packet* packet, unsigned int bufferSize) {
	int i;

	if (bufferSize < calculatePacketSize(packet)) {
		printf(
			"Buffer is too small:\n"
			"  Packet size: %i\n"
			"  Buffer size: %i\n",
			calculatePacketSize(packet),
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

	// Handle the different data types.
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

/**
 * Create a packet from a buffer.
 *
 * @param[in]	buffer	The buffer to unload from.
 *
 * @see Packet
 * @see convertPacketToBuffer()
 *
 * @return The packet if successful, otherwise NULL.
 */
struct Packet* convertBufferToPacket(unsigned char* buffer) {
	int i, offset;
	struct Packet* packet = (struct Packet*)malloc( sizeof( struct Packet ) );

	if (!packet)
		return NULL;

	// Get the type:
	packet->type = buffer[0];

	// Get the key
	packet->key = 0;

	for (i = 0; i < 4; i++)
		packet->key += buffer[1 + i] << 24 - i * 8;

	// Handle the different types.
	if (packet->type == QUERY)
		return packet;

	if (packet->type == KEY) {
		// Assign the data to be the rest of the buffer
		packet->data = buffer + 5;

		return packet;
	}

	if (packet->type == DATA) {
		// Unload the 8 bytes that represents position
		packet->position = 0;

		for (i = 0; i < 8; i++)
			packet->position += buffer[5 + i] << 56 - i * 8;

		// Unload the data
		packet->data = buffer + 13;

		return packet;
	}

	printf("Buffer did not match any known types. Type: #%i", packet->type);
	return NULL;
}

/**
 * Print a packet onto the terminal.
 *
 * @param[in]	packet	The packet to print.
 *
 * @see Packet
 */
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
		calculatePacketSize(packet)
	);
}

#endif
