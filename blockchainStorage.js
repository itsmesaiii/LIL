const fs = require('fs');
const path = require('path');
// File to store blockchain data (hash addresses and other details)
const blockchainDataFile = path.join(__dirname, 'blockchainData.txt');
// Function to append a block's details to the storage file
function storeBlockData(block) {
    const blockData = `Block ${block.index} | Hash: ${block.hash} | Prev Hash: ${block.previousHash} | IP: ${block.transactions[0].ip} | Message: ${block.transactions[0].message} | Timestamp: ${block.timestamp}\n`;
    fs.appendFile(blockchainDataFile, blockData, (err) => {
        if (err) {
            console.error('Failed to store block data:', err);
        } else {
            console.log('Block data stored successfully.');
        }
    });
}
// Function to get all blockchain data
function getAllBlockData() {
    return new Promise((resolve, reject) => {
        fs.readFile(blockchainDataFile, 'utf8', (err, data) => {
            if (err) {
                return reject('Failed to read blockchain data file');
            }
            resolve(data);
        });
    });
}

// Export functions to use in other files
module.exports = {
    storeBlockData,
    getAllBlockData
};
