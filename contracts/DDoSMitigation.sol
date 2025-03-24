// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DDoSMitigation {
    struct Message {
        address sender;
        string content;
        uint256 timestamp;
    }

    Message[] public messages;

    event MessageStored(address indexed sender, string content, uint256 timestamp);

    function storeMessage(string memory _content) public {
        messages.push(Message(msg.sender, _content, block.timestamp));
        emit MessageStored(msg.sender, _content, block.timestamp);
    }

    function getMessage(uint256 _index) public view returns (address, string memory, uint256) {
        require(_index < messages.length, "Invalid index");
        Message memory message = messages[_index];
        return (message.sender, message.content, message.timestamp);
    }

    function getAllMessages() public view returns (Message[] memory) {
        return messages;
    }
}
