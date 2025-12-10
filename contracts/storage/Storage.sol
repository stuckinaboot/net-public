// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 .0;

import {Net} from "../../net/Net.sol";

/// @title Storage
/// @author Aspyn Palatnick (aspyn.eth, stuckinaboot.eth)
/// @notice Data storage with persistent history using Net
contract Storage {
    event Stored(bytes32 indexed key, address indexed operator);

    struct BulkPutParams {
        bytes32 key;
        string text;
        bytes value;
    }

    struct BulkGetParams {
        bytes32 key;
        address operator;
    }

    struct BulkGetValueAtIndexParams {
        bytes32 key;
        address operator;
        uint256 idx;
    }

    struct BulkGetResult {
        string text;
        bytes value;
    }

    Net internal net = Net(0x00000000B24D62781dB359b07880a105cD0b64e6);

    /// @notice Store value for a given key
    /// @param key key
    /// @param text text
    /// @param value value
    function put(
        bytes32 key,
        string calldata text,
        bytes calldata value
    ) public {
        // Convert key to string
        string memory topic = string(abi.encodePacked(key));

        // Send message on Net
        net.sendMessageViaApp(msg.sender, text, topic, value);

        // Emit event
        emit Stored(key, msg.sender);
    }

    /// @notice Store values for given params
    /// @param params params
    function bulkPut(BulkPutParams[] calldata params) external {
        for (uint256 i; i < params.length; ) {
            put(params[i].key, params[i].text, params[i].value);
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Get value for a particular key and operator
    /// @param key key
    /// @param operator user that stored key
    /// @return (text, data) stored value for the particular key-operator pair
    function get(
        bytes32 key,
        address operator
    ) public view returns (string memory, bytes memory) {
        string memory topic = string(abi.encodePacked(key));
        // Get most recent message for particular key-operator pair
        Net.Message memory message = net.getMessageForAppUserTopic(
            net.getTotalMessagesForAppUserTopicCount(
                address(this),
                operator,
                topic
            ) - 1,
            address(this),
            operator,
            topic
        );
        return (message.text, message.data);
    }

    /// @notice Bulk get values for particular parameters
    /// @param params parameters
    /// @return results for stored values for the particular parameters
    function bulkGet(
        BulkGetParams[] calldata params
    ) public view returns (BulkGetResult[] memory results) {
        results = new BulkGetResult[](params.length);
        for (uint256 i; i < results.length; ) {
            (string memory text, bytes memory data) = get(
                params[i].key,
                params[i].operator
            );
            results[i] = BulkGetResult(text, data);
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Get value at index for a particular key and operator
    /// @param key key
    /// @param operator user that stored key
    /// @param idx index
    /// @return (text, data) stored value at index for the particular key-operator pair
    function getValueAtIndex(
        bytes32 key,
        address operator,
        uint256 idx
    ) public view returns (string memory, bytes memory) {
        Net.Message memory message = net.getMessageForAppUserTopic(
            idx,
            address(this),
            operator,
            string(abi.encodePacked(key))
        );
        return (message.text, message.data);
    }

    /// @notice Bulk get value at index for particular parameters
    /// @param params parameters
    /// @return results for stored values for the particular parameters
    function bulkGetValueAtIndex(
        BulkGetValueAtIndexParams[] calldata params
    ) public view returns (BulkGetResult[] memory results) {
        results = new BulkGetResult[](params.length);
        for (uint256 i; i < results.length; ) {
            (string memory text, bytes memory data) = getValueAtIndex(
                params[i].key,
                params[i].operator,
                params[i].idx
            );
            results[i] = BulkGetResult(text, data);
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Get total number of writes to a particular key for a given operator
    /// @param key key
    /// @param operator user that stored key
    /// @return total total writes count
    function getTotalWrites(
        bytes32 key,
        address operator
    ) public view returns (uint256) {
        return
            net.getTotalMessagesForAppUserTopicCount(
                address(this),
                operator,
                string(abi.encodePacked(key))
            );
    }

    /// @notice Bulk get total writes for particular parameters
    /// @param params parameters
    /// @return results for total writes for the particular parameters
    function bulkGetTotalWrites(
        BulkGetParams[] calldata params
    ) public view returns (uint256[] memory results) {
        results = new uint256[](params.length);
        for (uint256 i; i < results.length; ) {
            results[i] = getTotalWrites(params[i].key, params[i].operator);
            unchecked {
                ++i;
            }
        }
    }
}
