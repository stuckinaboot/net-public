// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 .0;

import {IStorage} from "../storage/IStorage.sol";

/// @title ChunkedStorageReader
/// @author Aspyn Palatnick (aspyn.eth, stuckinaboot.eth)
/// @notice Data storage reader with chunking support and historical access using Storage.sol
contract ChunkedStorageReader {
    IStorage internal netStorage =
        IStorage(0x00000000DB40fcB9f4466330982372e27Fd7Bbf5);

    // ChunkedStorage contract address - the actual operator that stores data
    address constant CHUNKED_STORAGE =
        0x000000A822F09aF21b1951B65223F54ea392E6C6;

    struct Metadata {
        uint8 chunkCount;
        string originalText;
    }

    /// @notice Get hashed key for a given key and operator
    /// @param key key
    /// @param operator user that stored key
    /// @return hashedKey the hashed key
    function _getHashedKey(
        bytes32 key,
        address operator
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(key, operator));
    }

    /// @notice Get metadata key for a given hashed key
    /// @param hashedKey hashed key
    /// @return metaKey the metadata key
    function _getMetaKey(bytes32 hashedKey) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(hashedKey, "meta"));
    }

    /// @notice Get chunk key for a given hashed key and chunk index
    /// @param hashedKey hashed key
    /// @param i chunk index
    /// @return chunkKey the chunk key
    function _getChunkKey(
        bytes32 hashedKey,
        uint8 i
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(hashedKey, "chunk", i));
    }

    /// @notice Get value for a particular key and operator (latest version)
    /// @param key key
    /// @param operator user that stored key
    /// @return (text, data) stored value for the particular key-operator pair
    function get(
        bytes32 key,
        address operator
    ) public view returns (string memory, bytes memory) {
        // Hash the original key with operator to match storage
        bytes32 hashedKey = _getHashedKey(key, operator);

        // Read metadata
        bytes32 metaKey = _getMetaKey(hashedKey);
        (, bytes memory metaBytes) = netStorage.get(metaKey, CHUNKED_STORAGE);

        if (metaBytes.length == 0) {
            return ("", "");
        }

        Metadata memory meta = abi.decode(metaBytes, (Metadata));

        // Prepare bulkGet parameters
        IStorage.BulkGetParams[] memory params = new IStorage.BulkGetParams[](
            meta.chunkCount
        );
        for (uint8 i = 0; i < meta.chunkCount; i++) {
            bytes32 chunkKey = _getChunkKey(hashedKey, i);
            params[i] = IStorage.BulkGetParams(chunkKey, CHUNKED_STORAGE);
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

    /// @notice Get value for a particular key and operator at specific historical index
    /// @param key key
    /// @param operator user that stored key
    /// @param idx historical index
    /// @return (text, data) stored value for the particular key-operator pair at index
    function getValueAtIndex(
        bytes32 key,
        address operator,
        uint256 idx
    ) public view returns (string memory, bytes memory) {
        // Hash the original key with operator to match storage
        bytes32 hashedKey = _getHashedKey(key, operator);

        // Read metadata at specific historical index
        (, bytes memory metaBytes) = netStorage.getValueAtIndex(
            _getMetaKey(hashedKey),
            CHUNKED_STORAGE,
            idx
        );

        if (metaBytes.length == 0) {
            return ("", "");
        }

        Metadata memory meta = abi.decode(metaBytes, (Metadata));

        // Calculate total size first
        uint totalSize = 0;
        for (uint8 i = 0; i < meta.chunkCount; i++) {
            bytes32 chunkKey = _getChunkKey(hashedKey, i);
            (, bytes memory chunkData) = netStorage.getValueAtIndex(
                chunkKey,
                CHUNKED_STORAGE,
                idx
            );
            totalSize += chunkData.length;
        }

        // Reassemble data
        bytes memory reassembled = new bytes(totalSize);
        uint offset = 0;

        for (uint8 i = 0; i < meta.chunkCount; i++) {
            bytes32 chunkKey = _getChunkKey(hashedKey, i);
            (, bytes memory chunkData) = netStorage.getValueAtIndex(
                chunkKey,
                CHUNKED_STORAGE,
                idx
            );

            // Copy chunk data to reassembled buffer
            for (uint j = 0; j < chunkData.length; j++) {
                reassembled[offset + j] = chunkData[j];
            }
            offset += chunkData.length;
        }

        return (meta.originalText, reassembled);
    }

    /// @notice Get metadata for chunked data (latest version)
    /// @param key key
    /// @param operator user that stored key
    /// @return chunkCount number of chunks
    /// @return originalText original text from storage
    function getMetadata(
        bytes32 key,
        address operator
    ) external view returns (uint8 chunkCount, string memory originalText) {
        bytes32 hashedKey = _getHashedKey(key, operator);
        bytes32 metaKey = _getMetaKey(hashedKey);

        (, bytes memory metaBytes) = netStorage.get(metaKey, CHUNKED_STORAGE);

        if (metaBytes.length == 0) {
            return (0, "");
        }

        Metadata memory meta = abi.decode(metaBytes, (Metadata));
        return (meta.chunkCount, meta.originalText);
    }

    /// @notice Get metadata for chunked data at specific historical index
    /// @param key key
    /// @param operator user that stored key
    /// @param idx historical index
    /// @return chunkCount number of chunks
    /// @return originalText original text from storage
    function getMetadataAtIndex(
        bytes32 key,
        address operator,
        uint256 idx
    ) external view returns (uint8 chunkCount, string memory originalText) {
        bytes32 hashedKey = _getHashedKey(key, operator);
        bytes32 metaKey = _getMetaKey(hashedKey);

        (, bytes memory metaBytes) = netStorage.getValueAtIndex(
            metaKey,
            CHUNKED_STORAGE,
            idx
        );

        if (metaBytes.length == 0) {
            return (0, "");
        }

        Metadata memory meta = abi.decode(metaBytes, (Metadata));
        return (meta.chunkCount, meta.originalText);
    }

    /// @notice Get a specific chunk by index (latest version)
    /// @param key key
    /// @param operator user that stored key
    /// @param chunkIndex index of chunk to retrieve (0-based)
    /// @return chunkData the chunk data
    function getChunk(
        bytes32 key,
        address operator,
        uint8 chunkIndex
    ) external view returns (bytes memory chunkData) {
        bytes32 hashedKey = _getHashedKey(key, operator);
        bytes32 chunkKey = _getChunkKey(hashedKey, chunkIndex);

        (, bytes memory data) = netStorage.get(chunkKey, CHUNKED_STORAGE);

        return data;
    }

    /// @notice Get a specific chunk by index at specific historical index
    /// @param key key
    /// @param operator user that stored key
    /// @param chunkIndex index of chunk to retrieve (0-based)
    /// @param idx historical index
    /// @return chunkData the chunk data
    function getChunkAtIndex(
        bytes32 key,
        address operator,
        uint8 chunkIndex,
        uint256 idx
    ) external view returns (bytes memory chunkData) {
        bytes32 hashedKey = _getHashedKey(key, operator);
        bytes32 chunkKey = _getChunkKey(hashedKey, chunkIndex);

        (, bytes memory data) = netStorage.getValueAtIndex(
            chunkKey,
            CHUNKED_STORAGE,
            idx
        );

        return data;
    }

    /// @notice Get multiple chunks at once (latest version)
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
        bytes32 hashedKey = _getHashedKey(key, operator);

        for (uint8 i = startIndex; i < endIndex; i++) {
            bytes32 chunkKey = _getChunkKey(hashedKey, i);

            (, bytes memory data) = netStorage.get(chunkKey, CHUNKED_STORAGE);

            chunks[i - startIndex] = data;
        }

        return chunks;
    }

    /// @notice Get multiple chunks at once at specific historical index
    /// @param key key
    /// @param operator user that stored key
    /// @param startIndex starting chunk index (inclusive)
    /// @param endIndex ending chunk index (exclusive)
    /// @param idx historical index
    /// @return chunks array of chunk data
    function getChunksAtIndex(
        bytes32 key,
        address operator,
        uint8 startIndex,
        uint8 endIndex,
        uint256 idx
    ) external view returns (bytes[] memory chunks) {
        require(startIndex < endIndex, "Invalid range");

        chunks = new bytes[](endIndex - startIndex);
        bytes32 hashedKey = _getHashedKey(key, operator);

        for (uint8 i = startIndex; i < endIndex; i++) {
            bytes32 chunkKey = _getChunkKey(hashedKey, i);

            (, bytes memory data) = netStorage.getValueAtIndex(
                chunkKey,
                CHUNKED_STORAGE,
                idx
            );

            chunks[i - startIndex] = data;
        }

        return chunks;
    }

    /// @notice Get total number of writes to a particular key for a given operator
    /// @param key key
    /// @param operator user that stored key
    /// @return total total writes count
    function getTotalWrites(
        bytes32 key,
        address operator
    ) public view returns (uint256) {
        bytes32 hashedKey = _getHashedKey(key, operator);
        bytes32 metaKey = _getMetaKey(hashedKey);
        return netStorage.getTotalWrites(metaKey, CHUNKED_STORAGE);
    }
}
