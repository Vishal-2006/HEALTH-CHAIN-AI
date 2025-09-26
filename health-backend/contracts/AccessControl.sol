// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title AccessControl
 * @dev Manages permissions and access control for health records
 */
contract AccessControl is Ownable, Pausable {
    
    struct Permission {
        string doctorId;
        string patientId;
        uint256 grantedAt;
        uint256 expiryDate;
        bool isActive;
        string accessLevel; // "read", "write", "full"
    }
    
    struct EmergencyAccess {
        string doctorId;
        string patientId;
        uint256 grantedAt;
        uint256 expiryDate;
        bool isActive;
        string reason;
    }
    
    // Mappings
    mapping(bytes32 => Permission) public permissions;
    mapping(bytes32 => EmergencyAccess) public emergencyAccess;
    mapping(string => bytes32[]) public patientPermissions; // patientId => permission keys
    mapping(string => bytes32[]) public doctorPermissions;  // doctorId => permission keys
    mapping(string => bool) public authorizedDoctors;
    mapping(string => bool) public registeredPatients;
    
    // Events
    event PermissionGranted(string doctorId, string patientId, string accessLevel, uint256 expiry);
    event PermissionRevoked(string doctorId, string patientId);
    event EmergencyAccessGranted(string doctorId, string patientId, string reason, uint256 expiry);
    event EmergencyAccessRevoked(string doctorId, string patientId);
    event DoctorAuthorized(string doctorId);
    event DoctorDeauthorized(string doctorId);
    event PatientRegistered(string patientId);
    event PatientUnregistered(string patientId);
    
    // Modifiers
    modifier onlyAuthorizedDoctor(string memory doctorId) {
        require(authorizedDoctors[doctorId], "Doctor not authorized");
        _;
    }
    
    modifier onlyRegisteredPatient(string memory patientId) {
        require(registeredPatients[patientId], "Patient not registered");
        _;
    }
    
    modifier onlyPermissionOwner(string memory doctorId, string memory patientId) {
        bytes32 permissionKey = keccak256(abi.encodePacked(doctorId, patientId));
        require(permissions[permissionKey].isActive, "No active permission");
        _;
    }
    
    /**
     * @dev Grant permission to a doctor to access patient records
     */
    function grantPermission(
        string memory doctorId,
        string memory patientId,
        string memory accessLevel,
        uint256 durationInDays
    ) external onlyOwner onlyAuthorizedDoctor(doctorId) onlyRegisteredPatient(patientId) {
        bytes32 permissionKey = keccak256(abi.encodePacked(doctorId, patientId));
        
        require(!permissions[permissionKey].isActive, "Permission already exists");
        
        uint256 expiryDate = block.timestamp + (durationInDays * 1 days);
        
        Permission memory newPermission = Permission({
            doctorId: doctorId,
            patientId: patientId,
            grantedAt: block.timestamp,
            expiryDate: expiryDate,
            isActive: true,
            accessLevel: accessLevel
        });
        
        permissions[permissionKey] = newPermission;
        patientPermissions[patientId].push(permissionKey);
        doctorPermissions[doctorId].push(permissionKey);
        
        emit PermissionGranted(doctorId, patientId, accessLevel, expiryDate);
    }
    
    /**
     * @dev Revoke permission for a doctor to access patient records
     */
    function revokePermission(
        string memory doctorId,
        string memory patientId
    ) external onlyOwner {
        bytes32 permissionKey = keccak256(abi.encodePacked(doctorId, patientId));
        
        require(permissions[permissionKey].isActive, "No active permission to revoke");
        
        permissions[permissionKey].isActive = false;
        
        emit PermissionRevoked(doctorId, patientId);
    }
    
    /**
     * @dev Grant emergency access to a doctor
     */
    function grantEmergencyAccess(
        string memory doctorId,
        string memory patientId,
        string memory reason,
        uint256 durationInHours
    ) external onlyOwner onlyAuthorizedDoctor(doctorId) onlyRegisteredPatient(patientId) {
        bytes32 emergencyKey = keccak256(abi.encodePacked("emergency", doctorId, patientId));
        
        require(!emergencyAccess[emergencyKey].isActive, "Emergency access already exists");
        
        uint256 expiryDate = block.timestamp + (durationInHours * 1 hours);
        
        EmergencyAccess memory newEmergencyAccess = EmergencyAccess({
            doctorId: doctorId,
            patientId: patientId,
            grantedAt: block.timestamp,
            expiryDate: expiryDate,
            isActive: true,
            reason: reason
        });
        
        emergencyAccess[emergencyKey] = newEmergencyAccess;
        
        emit EmergencyAccessGranted(doctorId, patientId, reason, expiryDate);
    }
    
    /**
     * @dev Revoke emergency access
     */
    function revokeEmergencyAccess(
        string memory doctorId,
        string memory patientId
    ) external onlyOwner {
        bytes32 emergencyKey = keccak256(abi.encodePacked("emergency", doctorId, patientId));
        
        require(emergencyAccess[emergencyKey].isActive, "No active emergency access to revoke");
        
        emergencyAccess[emergencyKey].isActive = false;
        
        emit EmergencyAccessRevoked(doctorId, patientId);
    }
    
    /**
     * @dev Authorize a doctor
     */
    function authorizeDoctor(string memory doctorId) external onlyOwner {
        require(!authorizedDoctors[doctorId], "Doctor already authorized");
        
        authorizedDoctors[doctorId] = true;
        
        emit DoctorAuthorized(doctorId);
    }
    
    /**
     * @dev Deauthorize a doctor
     */
    function deauthorizeDoctor(string memory doctorId) external onlyOwner {
        require(authorizedDoctors[doctorId], "Doctor not authorized");
        
        authorizedDoctors[doctorId] = false;
        
        emit DoctorDeauthorized(doctorId);
    }
    
    /**
     * @dev Register a patient
     */
    function registerPatient(string memory patientId) external onlyOwner {
        require(!registeredPatients[patientId], "Patient already registered");
        
        registeredPatients[patientId] = true;
        
        emit PatientRegistered(patientId);
    }
    
    /**
     * @dev Unregister a patient
     */
    function unregisterPatient(string memory patientId) external onlyOwner {
        require(registeredPatients[patientId], "Patient not registered");
        
        registeredPatients[patientId] = false;
        
        emit PatientUnregistered(patientId);
    }
    
    /**
     * @dev Check if a doctor has permission to access patient records
     */
    function hasPermission(
        string memory doctorId,
        string memory patientId
    ) external view returns (bool, string memory) {
        bytes32 permissionKey = keccak256(abi.encodePacked(doctorId, patientId));
        Permission memory permission = permissions[permissionKey];
        
        if (!permission.isActive) {
            return (false, "");
        }
        
        if (block.timestamp > permission.expiryDate) {
            return (false, "");
        }
        
        return (true, permission.accessLevel);
    }
    
    /**
     * @dev Check if a doctor has emergency access
     */
    function hasEmergencyAccess(
        string memory doctorId,
        string memory patientId
    ) external view returns (bool) {
        bytes32 emergencyKey = keccak256(abi.encodePacked("emergency", doctorId, patientId));
        EmergencyAccess memory emergency = emergencyAccess[emergencyKey];
        
        if (!emergency.isActive) {
            return false;
        }
        
        if (block.timestamp > emergency.expiryDate) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Get all permissions for a patient
     */
    function getPatientPermissions(string memory patientId) external view returns (bytes32[] memory) {
        return patientPermissions[patientId];
    }
    
    /**
     * @dev Get all permissions for a doctor
     */
    function getDoctorPermissions(string memory doctorId) external view returns (bytes32[] memory) {
        return doctorPermissions[doctorId];
    }
    
    /**
     * @dev Get permission details
     */
    function getPermission(
        string memory doctorId,
        string memory patientId
    ) external view returns (Permission memory) {
        bytes32 permissionKey = keccak256(abi.encodePacked(doctorId, patientId));
        return permissions[permissionKey];
    }
    
    /**
     * @dev Get emergency access details
     */
    function getEmergencyAccess(
        string memory doctorId,
        string memory patientId
    ) external view returns (EmergencyAccess memory) {
        bytes32 emergencyKey = keccak256(abi.encodePacked("emergency", doctorId, patientId));
        return emergencyAccess[emergencyKey];
    }
    
    /**
     * @dev Clean up expired permissions (can be called by anyone)
     */
    function cleanupExpiredPermissions() external {
        // This function can be called by anyone to clean up expired permissions
        // Implementation would iterate through permissions and mark expired ones as inactive
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
