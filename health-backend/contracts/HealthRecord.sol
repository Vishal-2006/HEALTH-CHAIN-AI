// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title HealthRecord
 * @dev Manages patient health records on the blockchain
 */
contract HealthRecord is Ownable, Pausable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _recordIds;
    
    struct HealthRecordData {
        uint256 recordId;
        string patientId;
        string doctorId;
        string dataHash;        // IPFS hash of encrypted health data
        string metadataHash;    // IPFS hash of metadata
        uint256 timestamp;
        bool isValid;
        bool isEncrypted;
    }
    
    struct Doctor {
        string doctorId;
        string name;
        string username;  // Added username field
        string specialization;
        bool isAuthorized;
        uint256 registrationDate;
    }
    
    struct Patient {
        string patientId;
        string name;
        string username;  // Added username field
        bool isRegistered;
        uint256 registrationDate;
    }
    
    // Mappings
    mapping(uint256 => HealthRecordData) public healthRecords;
    mapping(string => Doctor) public doctors;
    mapping(string => Patient) public patients;
    mapping(string => uint256[]) public patientRecords; // patientId => recordIds
    mapping(string => uint256[]) public doctorRecords;  // doctorId => recordIds
    mapping(bytes32 => bool) public recordExists;
    mapping(string => string) public usernameToUserId; // username => userId
    mapping(string => bool) public usernameExists;     // username => exists
    
    // Events
    event RecordAdded(uint256 indexed recordId, string patientId, string doctorId, string dataHash);
    event RecordUpdated(uint256 indexed recordId, string dataHash);
    event RecordInvalidated(uint256 indexed recordId);
    event DoctorRegistered(string doctorId, string name, string specialization);
    event PatientRegistered(string patientId, string name);
    event AccessGranted(string doctorId, string patientId);
    event AccessRevoked(string doctorId, string patientId);
    
    // Modifiers
    modifier onlyAuthorizedDoctor(string memory doctorId) {
        require(doctors[doctorId].isAuthorized, "Doctor not authorized");
        _;
    }
    
    modifier onlyRegisteredPatient(string memory patientId) {
        require(patients[patientId].isRegistered, "Patient not registered");
        _;
    }
    
    modifier recordExistsCheck(uint256 recordId) {
        require(healthRecords[recordId].isValid, "Record does not exist");
        _;
    }
    
    /**
     * @dev Register a new doctor
     */
    function registerDoctor(
        string memory doctorId,
        string memory name,
        string memory username,
        string memory specialization
    ) external onlyOwner {
        require(!doctors[doctorId].isAuthorized, "Doctor already registered");
        require(!usernameExists[username], "Username already taken");
        
        doctors[doctorId] = Doctor({
            doctorId: doctorId,
            name: name,
            username: username,
            specialization: specialization,
            isAuthorized: true,
            registrationDate: block.timestamp
        });
        
        usernameToUserId[username] = doctorId;
        usernameExists[username] = true;
        
        emit DoctorRegistered(doctorId, name, specialization);
    }
    
    /**
     * @dev Register a new patient
     */
    function registerPatient(
        string memory patientId,
        string memory name,
        string memory username
    ) external onlyOwner {
        require(!patients[patientId].isRegistered, "Patient already registered");
        require(!usernameExists[username], "Username already taken");
        
        patients[patientId] = Patient({
            patientId: patientId,
            name: name,
            username: username,
            isRegistered: true,
            registrationDate: block.timestamp
        });
        
        usernameToUserId[username] = patientId;
        usernameExists[username] = true;
        
        emit PatientRegistered(patientId, name);
    }
    
    /**
     * @dev Add a new health record
     */
    function addHealthRecord(
        string memory patientId,
        string memory doctorId,
        string memory dataHash,
        string memory metadataHash,
        bool isEncrypted
    ) external onlyAuthorizedDoctor(doctorId) onlyRegisteredPatient(patientId) {
        _recordIds.increment();
        uint256 newRecordId = _recordIds.current();
        
        HealthRecordData memory newRecord = HealthRecordData({
            recordId: newRecordId,
            patientId: patientId,
            doctorId: doctorId,
            dataHash: dataHash,
            metadataHash: metadataHash,
            timestamp: block.timestamp,
            isValid: true,
            isEncrypted: isEncrypted
        });
        
        healthRecords[newRecordId] = newRecord;
        patientRecords[patientId].push(newRecordId);
        doctorRecords[doctorId].push(newRecordId);
        
        bytes32 recordKey = keccak256(abi.encodePacked(patientId, doctorId, dataHash));
        recordExists[recordKey] = true;
        
        emit RecordAdded(newRecordId, patientId, doctorId, dataHash);
    }
    
    /**
     * @dev Update an existing health record
     */
    function updateHealthRecord(
        uint256 recordId,
        string memory newDataHash,
        string memory newMetadataHash
    ) external recordExistsCheck(recordId) {
        HealthRecordData storage record = healthRecords[recordId];
        require(
            keccak256(abi.encodePacked(msg.sender)) == keccak256(abi.encodePacked(record.doctorId)) ||
            owner() == msg.sender,
            "Only the original doctor or owner can update"
        );
        
        record.dataHash = newDataHash;
        record.metadataHash = newMetadataHash;
        record.timestamp = block.timestamp;
        
        emit RecordUpdated(recordId, newDataHash);
    }
    
    /**
     * @dev Invalidate a health record
     */
    function invalidateRecord(uint256 recordId) external onlyOwner recordExistsCheck(recordId) {
        healthRecords[recordId].isValid = false;
        emit RecordInvalidated(recordId);
    }
    
    /**
     * @dev Get all records for a patient
     */
    function getPatientRecords(string memory patientId) external view returns (uint256[] memory) {
        return patientRecords[patientId];
    }
    
    /**
     * @dev Get all records created by a doctor
     */
    function getDoctorRecords(string memory doctorId) external view returns (uint256[] memory) {
        return doctorRecords[doctorId];
    }
    
    /**
     * @dev Get health record details
     */
    function getHealthRecord(uint256 recordId) external view returns (HealthRecordData memory) {
        return healthRecords[recordId];
    }
    
    /**
     * @dev Get doctor information
     */
    function getDoctor(string memory doctorId) external view returns (Doctor memory) {
        return doctors[doctorId];
    }
    
    /**
     * @dev Get patient information
     */
    function getPatient(string memory patientId) external view returns (Patient memory) {
        return patients[patientId];
    }
    
    /**
     * @dev Check if a record exists
     */
    function checkRecordExists(bytes32 recordKey) external view returns (bool) {
        return recordExists[recordKey];
    }
    
    /**
     * @dev Check if username exists
     */
    function checkUsernameExists(string memory username) external view returns (bool) {
        return usernameExists[username];
    }
    
    /**
     * @dev Get user ID by username
     */
    function getUserIdByUsername(string memory username) external view returns (string memory) {
        return usernameToUserId[username];
    }
    
    /**
     * @dev Get user by username (returns role and ID)
     */
    function getUserByUsername(string memory username) external view returns (string memory userId, string memory role) {
        require(usernameExists[username], "Username does not exist");
        
        string memory userAddress = usernameToUserId[username];
        
        // Check if it's a doctor
        if (doctors[userAddress].isAuthorized) {
            return (userAddress, "doctor");
        }
        // Check if it's a patient
        else if (patients[userAddress].isRegistered) {
            return (userAddress, "patient");
        }
        
        revert("User not found");
    }
    
    /**
     * @dev Pause the contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
