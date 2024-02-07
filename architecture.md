# Architecture

This project uses Welo database to form a set of CIDs and their (virtual) paths they are contained under to create a virtual filesystem which can then be queried over CLI or mounted using FUSE.

These files are automatically downloaded in a multiplexed system through a daemon to provide redundancy. The daemon keeps a list of historical versions to provide more security in case of data corruption.

The Welo database has two prefixes for keys: `/r` & `/v`, the `/r` prefix is for current data and the `/v` prefix holds historical versions.
