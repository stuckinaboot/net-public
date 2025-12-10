// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 .0;

import {IStorage} from "../storage/IStorage.sol";
import {IChunkedStorage} from "../chunked-storage/IChunkedStorage.sol";

/// @title StorageRouter
/// @author Aspyn Palatnick (aspyn.eth, stuckinaboot.eth)
/// @notice Router for reading from Storage.sol and ChunkedStorage
contract StorageRouter {
    IStorage internal regularStorage =
        IStorage(0x00000000DB40fcB9f4466330982372e27Fd7Bbf5);
    IChunkedStorage internal chunkedStorage =
        IChunkedStorage(0x000000A822F09aF21b1951B65223F54ea392E6C6);

    error StoredDataNotFound();

    /// @notice Get data with storage type indication
    /// @param key key
    /// @param operator user that stored key
    /// @return isChunkedStorage true if data comes from chunked storage
    /// @return text original text
    /// @return data for regular storage: actual data, for chunked: encoded chunk count
    function get(
        bytes32 key,
        address operator
    )
        external
        view
        returns (bool isChunkedStorage, string memory text, bytes memory data)
    {
        // Try ChunkedStorage metadata first
        try chunkedStorage.getMetadata(key, operator) returns (
            uint8 chunkCount,
            string memory originalText
        ) {
            if (chunkCount > 0) {
                // Found chunked data
                return (true, originalText, abi.encode(chunkCount));
            }
        } catch {
            // ChunkedStorage failed, continue to regular storage
        }

        // Try regular Storage.sol
        try regularStorage.get(key, operator) returns (
            string memory regularText,
            bytes memory regularData
        ) {
            if (regularData.length > 0) {
                // Found regular data
                return (false, regularText, regularData);
            }
        } catch {
            // Regular storage failed
        }

        // No data found in either storage
        revert StoredDataNotFound();
    }
}
