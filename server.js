const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const {Web3} = require('web3'); // Corrected import
const app = express();
const { Block, Blockchain } = require('./Blockchain'); // Import your blockchain classes
const { storeBlockData, getAllBlockData } = require('./blockchainStorage'); // Import storage functions
const customBlockchain = new Blockchain();

app.use(express.static('public'));
app.use(bodyParser.json());

// Initialize Web3 and connect to Ganache
const web3 = new Web3('http://127.0.0.1:7545'); // Updated to avoid connection issues
const contractAddress = '0x75c5d83d686eB0f25f2D7dbF04F78aC763D3E0e9'; // Replace with your contract's address
const contractABI = [{
  "anonymous": false,
  "inputs": [
    {
      "indexed": true,
      "internalType": "address",
      "name": "sender",
      "type": "address"
    },
    {
      "indexed": false,
      "internalType": "string",
      "name": "content",
      "type": "string"
    },
    {
      "indexed": false,
      "internalType": "uint256",
      "name": "timestamp",
      "type": "uint256"
    }
  ],
  "name": "MessageStored",
  "type": "event"
},
{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "name": "messages",
  "outputs": [
    {
      "internalType": "address",
      "name": "sender",
      "type": "address"
    },
    {
      "internalType": "string",
      "name": "content",
      "type": "string"
    },
    {
      "internalType": "uint256",
      "name": "timestamp",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function",
  "constant": true
},
{
  "inputs": [
    {
      "internalType": "string",
      "name": "_content",
      "type": "string"
    }
  ],
  "name": "storeMessage",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "_index",
      "type": "uint256"
    }
  ],
  "name": "getMessage",
  "outputs": [
    {
      "internalType": "address",
      "name": "",
      "type": "address"
    },
    {
      "internalType": "string",
      "name": "",
      "type": "string"
    },
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function",
  "constant": true
},
{
  "inputs": [],
  "name": "getAllMessages",
  "outputs": [
    {
      "components": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "internalType": "struct DDoSMitigation.Message[]",
      "name": "",
      "type": "tuple[]"
    }
  ],
  "stateMutability": "view",
  "type": "function",
  "constant": true
}];
const messageStorageContract = new web3.eth.Contract(contractABI, contractAddress);

// Store IP activity and attackers
const ipActivity = {};
const attackers = [];

const attackersFilePath = path.join(__dirname, 'attackers.txt');

// Load blocked IPs into memory at startup
let blockedIPs = [];
if (fs.existsSync(attackersFilePath)) {
    const data = fs.readFileSync(attackersFilePath, 'utf8');
    // Extract IPs from each line (assuming log format: `timestamp - IP blocked for DDoS attempt`)
    blockedIPs = data
        .split('\n')
        .map(line => {
            const parts = line.split(' - ');
            return parts.length > 1 ? parts[1].split(' ')[0] : null;
        })
        .filter(ip => ip !== null);
}

console.log('Blocked IPs loaded:', blockedIPs);

// Endpoint to receive messages
app.post('/send-message', async (req, res) => {
    const ipAddress = req.ip;
    const timestamp = Date.now();
    const message = req.body.message;

    // Check if the IP is in the attackers list
    if (attackers.includes(ipAddress) || blockedIPs.includes(ipAddress)) {
        return res.status(403).send('Message from attacker blocked');
    }

    // Initialize or update IP activity
    if (!ipActivity[ipAddress]) {
        ipActivity[ipAddress] = [];
    }

    // Remove entries older than 10 seconds
    ipActivity[ipAddress] = ipActivity[ipAddress].filter(time => timestamp - time <= 10000);

    // Add the current timestamp to the IP's activity log
    ipActivity[ipAddress].push(timestamp);

    // Check for DDoS-like activity
    if (ipActivity[ipAddress].length >= 10) {
      attackers.push(ipAddress); // Block the IP
      const blockData = {
          ip: ipAddress,
          message: 'Blocked for DDoS attempt',
      };
  
      const newBlock = new Block(
          customBlockchain.chain.length,
          new Date().toISOString(),
          [blockData],
          customBlockchain.getLatestBlock().hash
      );
  
      customBlockchain.addBlock(newBlock);
      storeBlockData(newBlock);
  
      console.log(`IP ${ipAddress} added to blockchain and local attackers list.`);
  
      const attackersFilePath = path.join(__dirname, 'attackers.txt');
  
      // Log the blocked IP in the text file
      fs.appendFile(
          attackersFilePath,
          `${new Date().toISOString()} - ${ipAddress} blocked for DDoS attempt\n`,
          (err) => {
              if (err) {
                  console.error('Failed to log attacker:', err);
              }
          }
      );
  
      return res.status(403).send('Message from attacker blocked');
  }

    // Log the message if not blocked
    const logEntry = `${new Date().toISOString()} - ${ipAddress} - ${message}\n`;
    const filePath = path.join(__dirname, 'messages.txt');

    fs.appendFile(filePath, logEntry, (err) => {
        if (err) {
            console.error('Failed to write message to file:', err);
            return res.status(500).send('Internal Server Error');
        }
        console.log('Message stored successfully');
    });

    // Send the message to the blockchain
    try {
        const accounts = await web3.eth.getAccounts(); // Get Ganache accounts
        const senderAccount = accounts[0]; // Use the first Ganache account

        // Ensure enough gas is allocated for the transaction
        await messageStorageContract.methods.storeMessage(message).send({
            from: senderAccount,
            gas: 3000000, // Adjust gas limit as needed
        });

        console.log('Message stored in the blockchain');
        res.status(200).send('Message received and stored');
    } catch (err) {
        console.error('Error storing message in blockchain:', err);
        res.status(500).send('Failed to store message in blockchain');
    }
});

app.get('/blockedlist', (req, res) => {
  const attackersFilePath = path.join(__dirname, 'attackers.txt');

  fs.readFile(attackersFilePath, 'utf8', (err, data) => {
      if (err) {
          console.error('Failed to read attackers file:', err);
          return res.status(500).send('Failed to read blocked IPs');
      }
      res.send(data);
  });
});
app.get('/get-blocked-attackers', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  const attackersFilePath = path.join(__dirname, 'attackers.txt');

  fs.readFile(attackersFilePath, 'utf8', (err, data) => {
      if (err) {
          console.error('Failed to read attackers file:', err);
          return res.status(500).json({ error: 'Failed to load attackers list' });
      }

      const lines = data.trim().split('\n');

      const attackers = lines.map((line) => {
          const parts = line.split(' - ');
          const timestamp = parts[0].trim();
          const ip = parts[1].split(' ')[0].trim();

          const dateObj = new Date(timestamp);
          const date = dateObj.toLocaleDateString();
          const time = dateObj.toLocaleTimeString();

          return {
              ip,
              date,
              time,
              blockAddress: 'N/A', // You can replace this with real data if needed later
              blockchainTimestamp: Math.floor(dateObj.getTime() / 1000) // Timestamp in seconds
          };
      });

      res.json(attackers);
  });
});

// Start the server
app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on http://localhost:3000');
});
