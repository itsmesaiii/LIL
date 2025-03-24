const crypto = require('crypto');
// Define the structure of a single Block
class Block {
    constructor(index, timestamp, transactions, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions; // List of transactions (e.g., messages or IP verification data)
        this.previousHash = previousHash; // Hash of the previous block
        this.hash = this.calculateHash();  // Hash of this block
    }
    // Calculate the hash of the block based on its contents
    calculateHash() {
        return crypto.createHash('sha256').update(
            this.index +
            this.timestamp +
            JSON.stringify(this.transactions) +
            this.previousHash
        ).digest('hex');
    }
}
// Define the structure of the Blockchain
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];  // Start the blockchain with a genesis block
    }
    // Create the first block (genesis block)
    createGenesisBlock() {
        return new Block(0, '2024-01-01', 'Genesis Block', '0');
    }
    // Get the latest block in the blockchain
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    // Add a new block to the blockchain
    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash; // Set the hash of the previous block
        newBlock.hash = newBlock.calculateHash(); // Recalculate the hash of the new block
        this.chain.push(newBlock);
    }
    // Validate the blockchain integrity by checking hashes
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            // Check if the current block's hash is valid
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
            // Check if the current block's previousHash matches the previous block's hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
    // Check if a transaction exists in the blockchain (verifying user)
    isTransactionValid(transaction) {
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx === transaction) {
                    return true;
                }
            }
        }
        return false;
    }
}
// Export both Block and Blockchain classes
module.exports = { Block, Blockchain };
