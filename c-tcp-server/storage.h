/*
	@file
	@brief This file handles the methods needed to work with the filesystem.
*/
#include <sys/stat.h>
#include <errno.h>
#define __USE_LARGEFILE64
#include <unistd.h>
#include <sys/types.h>

#ifndef STORAGE_H
#define STORAGE_H

/**
 * Write to a section of a file.
 *
 * @param[in]	buffer		The buffer in which to write bytes to the file from.
 * @param[in]	ptr 		The pointer to the file to write to.
 * @param[in]	chunkSize	The number of bytes to write.
 * @param[in]	position	The number of bytes to skip before writing.
 *
 * @return The number of bytes written to the file, this should almost always
 * match chunkSize.
 */
int writeSection (unsigned char* buffer, FILE* ptr, int chunkSize, int position) {
	size_t writtenBytes;
	int i;

	// Seek through file
	if (fseek(ptr, position, SEEK_SET) < 0 ) {
		printf("Failed to seek file. (%i)\n", errno);
		return -1;
	}

	// Read file
	writtenBytes = fwrite(buffer, 1, chunkSize, ptr);

	if (ferror(ptr)) {
		printf("Failed to read file. (%i)\n", errno);
		return -1;
	}

	return writtenBytes;
}

/**
 * Read a section of a file.
 *
 * @param[out]	buffer		The buffer to write the bytes that will be read from
 * the file.
 * @param[in]	ptr 		The pointer to the file to read from.
 * @param[in]	chunkSize	The number of bytes to read.
 * @param[in]	position	The number of bytes to skip before reading.
 *
 * @return The number of bytes read from the file, this should always match
 * chunkSize with the exception of the last part of the file.
 */
int readSection (unsigned char* buffer, FILE* ptr, int chunkSize, int position) {
	size_t readBytes;
	int i;

	// Seek through file
	if (fseek(ptr, position, SEEK_SET) < 0 ) {
		printf("Failed to seek file. (%i)\n", errno);
		return -1;
	}

	// Read file
	readBytes = fread(buffer, 1, chunkSize, ptr);

	if (ferror(ptr)) {
		printf("Failed to read file. (%i)\n", errno);
		return -1;
	}

	return readBytes;
}

/**
 * Get the size of a file.
 *
 * @param[in]	ptr 	The pointer to the file to get the size of.
 *
 * @return The size of the file in bytes.
 */
off64_t getFileSize (FILE* ptr) {
	off64_t fileSize, currPos;
	int fileDes = fileno(ptr);

	// Save the current position.
	currPos = lseek64(fileDes, 0, SEEK_CUR);

	if (currPos < 0) {
		printf("Failed to get current position of file. (%i)\n", errno);
		return -1;
	}

	// Seek to the end of the file and get size.
	fileSize = lseek64(fileDes, 0, SEEK_END);

	if (fileSize < 0) {
		printf("Failed to get seek to end of file. (%i)\n", errno);
		return -1;
	}

	// Reset the seek position to where it was.
	currPos = lseek64(fileDes, currPos, SEEK_SET);

	if (currPos < 0) {
		printf("Failed to reset seek position. (%i)\n", errno);
		return -1;
	}

	return fileSize;
}

/**
 * Flush buffers to, truncate and close file.
 *
 * @param[in]	ptr 	The pointer to the file to close.
 * @param[in]	length	The size in bytes the file should be truncated to. Set
 * to -1 if it should not be truncated.
 *
 * @return If success returns 0, otherwise -1.
 */
int closeFile (FILE *ptr, int length) {
	int state = 0;

	if (fflush(ptr) != 0) {
		printf("Failed to flush file. (%i)\n", errno);
		state = -1;
	}

	if (length >= 0) {
		if (ftruncate(fileno(ptr), length) != 0) {
			printf("Failed to truncate file. (%i)\n", errno);
			state = -1;
		}
	}

	if (fclose(ptr) != 0) {
		printf("Failed to close file. (%i)\n", errno);
		state = -1;
	}

	return state;
}

/**
 * Open a file for reading and writing, creating it if it doesn't exist.
 *
 * @param[in]	path 	The path to the file to open.
 *
 * @return The file pointer if successful, otherwise NULL.
 */
FILE *openFile (char* path) {
	FILE *ptr = fopen(path, "r+b");

	if (ptr == NULL && errno != 2)
		return NULL;

	if (ptr == NULL) {
		ptr = fopen(path, "w");

		if (fclose(ptr) != 0) {
			printf("Failed to close file. (%i)\n", errno);
			return NULL;
		}

		ptr = fopen(path, "r+b");

		if (ptr == NULL) {
			printf("Failed to open file. (%i)\n", errno);
			return NULL;
		}
	}

	return ptr;
}

/**
 * Open a file for reading and writing, creating it and all folders if needed.
 *
 * @param[in]	path	The path to the file.
 *
 * @return The file pointer if successful, otherwise NULL.
 */
FILE *openFileCreatingPath (char* path) {
	int i;
	char* partPath = (char*)malloc(sizeof(char) * strlen(path));

	for (i = 0; i < strlen(path); i++) {
		// Ignore the "./" path.
		if (path[i] == '/' && !(partPath[i-1] == '.' && i == 1)) {
			// Create folder
			if (mkdir(partPath, 0777) < 0 && errno != EEXIST) {
				printf("Failed to create folder. (%i)", errno);
				return NULL;
			}
		}

		partPath[i] = path[i];
	}

	return openFile(partPath);
}

#endif
