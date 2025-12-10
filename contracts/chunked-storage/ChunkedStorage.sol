// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 .0;

import {IStorage} from "../storage/IStorage.sol";

/// @title ChunkedStorage
/// @author Aspyn Palatnick (aspyn.eth, stuckinaboot.eth)
/// @notice Data storage with chunking support using Storage.sol
contract ChunkedStorage {
    IStorage internal netStorage =
        IStorage(0x00000000DB40fcB9f4466330982372e27Fd7Bbf5);

    uint8 constant MAX_CHUNKS = 255;

    error DataTooLarge();

    event ChunkedStoragePut(
        bytes32 indexed originalKey,
        address indexed sender,
        bytes32 hashedKey
    );

    struct Metadata {
        uint8 chunkCount;
        string originalText;
    }

    /// @notice Store pre-computed chunks
    /// @param key key
    /// @param text original text
    /// @param chunks array of pre-computed chunk data
    function put(
        bytes32 key,
        string calldata text,
        bytes[] calldata chunks
    ) public {
        if (chunks.length == 0) revert DataTooLarge();
        if (chunks.length > MAX_CHUNKS) revert DataTooLarge();

        // Hash the original key with msg.sender to create user-specific namespace
        bytes32 hashedKey = keccak256(abi.encodePacked(key, msg.sender));

        // Emit log with original key and msg.sender
        emit ChunkedStoragePut(key, msg.sender, hashedKey);

        // Store each chunk
        for (uint8 i = 0; i < chunks.length; i++) {
            bytes32 chunkKey = keccak256(
                abi.encodePacked(hashedKey, "chunk", i)
            );
            netStorage.put(chunkKey, "", chunks[i]);
        }

        // Store metadata
        bytes32 metaKey = keccak256(abi.encodePacked(hashedKey, "meta"));
        Metadata memory meta = Metadata(uint8(chunks.length), text);
        netStorage.put(metaKey, "", abi.encode(meta));
    }

    /// @notice Get value for a particular key and operator
    /// @param key key
    /// @param operator user that stored key
    /// @return (text, data) stored value for the particular key-operator pair
    function get(
        bytes32 key,
        address operator
    ) public view returns (string memory, bytes memory) {
        // Hash the original key with operator to match storage
        bytes32 hashedKey = keccak256(abi.encodePacked(key, operator));

        // Read metadata
        bytes32 metaKey = keccak256(abi.encodePacked(hashedKey, "meta"));
        (, bytes memory metaBytes) = netStorage.get(metaKey, address(this));

        if (metaBytes.length == 0) {
            return ("", "");
        }

        Metadata memory meta = abi.decode(metaBytes, (Metadata));

        // Prepare bulkGet parameters
        IStorage.BulkGetParams[] memory params = new IStorage.BulkGetParams[](
            meta.chunkCount
        );
        for (uint8 i = 0; i < meta.chunkCount; i++) {
            bytes32 chunkKey = keccak256(
                abi.encodePacked(hashedKey, "chunk", i)
            );
            params[i] = IStorage.BulkGetParams(chunkKey, address(this));
        }

        // Read all chunks
        IStorage.BulkGetResult[] memory results = netStorage.bulkGet(params);

        // Calculate total size by summing chunk lengths
        uint totalSize = 0;
        for (uint8 i = 0; i < meta.chunkCount; i++) {
            totalSize += results[i].value.length;
        }

        // Reassemble data
        bytes memory reassembled = new bytes(totalSize);
        uint offset = 0;

        for (uint8 i = 0; i < meta.chunkCount; i++) {
            bytes memory chunkData = results[i].value;

            // Copy chunk data to reassembled buffer
            for (uint j = 0; j < chunkData.length; j++) {
                reassembled[offset + j] = chunkData[j];
            }
            offset += chunkData.length;
        }

        return (meta.originalText, reassembled);
    }

    /// @notice Get metadata for chunked data
    /// @param key key
    /// @param operator user that stored key
    /// @return chunkCount number of chunks
    /// @return originalText original text from storage
    function getMetadata(
        bytes32 key,
        address operator
    ) external view returns (uint8 chunkCount, string memory originalText) {
        bytes32 hashedKey = keccak256(abi.encodePacked(key, operator));
        bytes32 metaKey = keccak256(abi.encodePacked(hashedKey, "meta"));

        (, bytes memory metaBytes) = netStorage.get(metaKey, address(this));

        if (metaBytes.length == 0) {
            return (0, "");
        }

        Metadata memory meta = abi.decode(metaBytes, (Metadata));
        return (meta.chunkCount, meta.originalText);
    }

    /// @notice Get a specific chunk by index
    /// @param key key
    /// @param operator user that stored key
    /// @param chunkIndex index of chunk to retrieve (0-based)
    /// @return chunkData the chunk data
    function getChunk(
        bytes32 key,
        address operator,
        uint8 chunkIndex
    ) external view returns (bytes memory chunkData) {
        bytes32 hashedKey = keccak256(abi.encodePacked(key, operator));
        bytes32 chunkKey = keccak256(
            abi.encodePacked(hashedKey, "chunk", chunkIndex)
        );

        (, bytes memory data) = netStorage.get(chunkKey, address(this));

        return data;
    }

    /// @notice Get multiple chunks at once
    /// @param key key
    /// @param operator user that stored key
    /// @param startIndex starting chunk index (inclusive)
    /// @param endIndex ending chunk index (exclusive)
    /// @return chunks array of chunk data
    function getChunks(
        bytes32 key,
        address operator,
        uint8 startIndex,
        uint8 endIndex
    ) external view returns (bytes[] memory chunks) {
        require(startIndex < endIndex, "Invalid range");

        chunks = new bytes[](endIndex - startIndex);
        bytes32 hashedKey = keccak256(abi.encodePacked(key, operator));

        for (uint8 i = startIndex; i < endIndex; i++) {
            bytes32 chunkKey = keccak256(
                abi.encodePacked(hashedKey, "chunk", i)
            );

            (, bytes memory data) = netStorage.get(chunkKey, address(this));

            chunks[i - startIndex] = data;
        }

        return chunks;
    }
}
