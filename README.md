# Distributed Backup

A distributed backup system running on Libp2p, IPFS and Welo.

## Environment

nodejs will need to be installed to run this project, it has been tested on v18, v20 has typescript issues.

## Setup

### Compile

Install dependencies:
```
npm i
```

Build:
```
npm run build
```

### Generate Config

You will need to create a configuration directory:
```
mkdir config
```

Then create a configuration file similar to the following and save it to your config directory:
```json
{
	"private": false,
	"serverMode": false,
	"validateInterval": 10,
	"tickInterval": 0.1,
	"storage": "/path/to/data",
	"defaultRevisionStrategy": "log",
	"addresses": [ "/ip4/0.0.0.0/tcp/0" ],
	"bootstrap": []
}
```

You can use `:memory:` if you want all data to be stored in memory instead of the disk.

### Generate Key File

You first need to generate a key for this server:
```
node dist/generate-keys.js -p config/key.json
```

Write down your mnemonic and name since this is what you will need to recover the server.

## Running

The system is setup in two parts - a client and a daemon, you will need to run the daemon first and then use it via the client.

You can add the `--help` flag to any script to get more help.

You can also add the `-s /path/to/socket` to configure where the socket file is located, this can be useful for running multiple daemons on the same machine.

### Daemon
Start the daemon with:

```
DEBUG=backup* node dist/daemon.js -k config/key1.json -c config/config.json
```

### Client

#### Create a Group

```
GROUP=$(node dist/client.js create-group GROUP_NAME)
```

#### Join a Group

```
node dist/client.js join-group $GROUP
```

#### Add Content to a Group

```
CID=$(node dist/client.js add $GROUP <FILE OR DIRECTORY>)
```

#### Export Content from a Group

```
node dist/client.js export $CID <PATH TO EXPORT TO>
```

#### List All Content

```
node dist/client.js list
```

#### List All Groups

```
node dist/client.js list-groups
```
