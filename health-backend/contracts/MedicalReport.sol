// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MedicalReport
 * @dev Manages encrypted medical reports with IPFS storage and blockchain metadata
 */
contract MedicalReport is Ownable, Pausable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _reportIds;
    
    struct MedicalReportData {
        uint256 reportId;
        string patientId;
        string doctorId;
        string ipfsHash;           // IPFS hash of the medical report file
        string encryptedMetadata;  // Encrypted JSON metadata
        string reportType;         // Type of report (Lab, Imaging, Vital Signs, etc.)
        uint256 timestamp;
        bool isValid;
        bool isEncrypted;
        string accessHash;         // Hash for access control
    }
    
    struct ReportAccess {
        string doctorId;
        string patientId;
        uint256 reportId;
        uint256 accessTimestamp;
        bool hasAccess;
        string accessLevel;        // "read", "write", "admin"
    }
    
    struct ReportMetadata {
        string reportType;
        string[] extractedMetrics;
        string[] units;
        string[] values;
        string riskLevel;
        string urgency;
        string recommendations;
    }
    
    // Mappings
    mapping(uint256 => MedicalReportData) public medicalReports;
    mapping(string => uint256[]) public patientReports;     // patientId => reportIds
    mapping(string => uint256[]) public doctorReports;      // doctorId => reportIds
    mapping(bytes32 => ReportAccess) public reportAccess;   // accessHash => access details
    mapping(string => bool) public authorizedDoctors;       // doctorId => authorized
    mapping(string => bool) public registeredPatients;      // patientId => registered
    
    // Events
    event ReportAdded(uint256 indexed reportId, string patientId, string ipfsHash, string reportType);
    event ReportAccessed(uint256 indexed reportId, string doctorId, string accessLevel);
    event AccessGranted(string doctorId, string patientId, uint256 reportId);
    event AccessRevoked(string doctorId, string patientId, uint256 reportId);
    event MetadataUpdated(uint256 indexed reportId, string newMetadata);
    
    // Modifiers
    modifier onlyAuthorizedDoctor(string memory doctorId) {
        require(authorizedDoctors[doctorId], "Doctor not authorized");
        _;
    }
    
    modifier onlyRegisteredPatient(string memory patientId) {
        require(registeredPatients[patientId], "Patient not registered");
        _;
    }
    
    modifier reportExistsCheck(uint256 reportId) {
        require(medicalReports[reportId].isValid, "Report does not exist");
        _;
    }
    
    modifier hasAccess(string memory doctorId, uint256 reportId) {
        bytes32 accessHash = keccak256(abi.encodePacked(doctorId, reportId));
        require(reportAccess[accessHash].hasAccess, "No access to this report");
        _;
    }
    
    /**
     * @dev Add a new medical report
     */
    function addMedicalReport(
        string memory patientId,
        string memory ipfsHash,
        string memory encryptedMetadata,
        string memory reportType
    ) external onlyRegisteredPatient(patientId) returns (uint256) {
        _reportIds.increment();
        uint256 newReportId = _reportIds.current();
        
        // Generate access hash
        string memory accessHash = string(abi.encodePacked(
            patientId, "_", ipfsHash, "_", uint2str(block.timestamp)
        ));
        
        medicalReports[newReportId] = MedicalReportData({
            reportId: newReportId,
            patientId: patientId,
            doctorId: "",  // Will be set when doctor accesses
            ipfsHash: ipfsHash,
            encryptedMetadata: encryptedMetadata,
            reportType: reportType,
            timestamp: block.timestamp,
            isValid: true,
            isEncrypted: true,
            accessHash: accessHash
        });
        
        // Add to patient's reports
        patientReports[patientId].push(newReportId);
        
        emit ReportAdded(newReportId, patientId, ipfsHash, reportType);
        return newReportId;
    }
    
    /**
     * @dev Grant access to a doctor for a specific report
     */
    function grantReportAccess(
        string memory doctorId,
        uint256 reportId,
        string memory accessLevel
    ) external onlyAuthorizedDoctor(doctorId) reportExistsCheck(reportId) {
        bytes32 accessHash = keccak256(abi.encodePacked(doctorId, reportId));
        
        reportAccess[accessHash] = ReportAccess({
            doctorId: doctorId,
            patientId: medicalReports[reportId].patientId,
            reportId: reportId,
            accessTimestamp: block.timestamp,
            hasAccess: true,
            accessLevel: accessLevel
        });
        
        // Add to doctor's reports
        doctorReports[doctorId].push(reportId);
        
        emit AccessGranted(doctorId, medicalReports[reportId].patientId, reportId);
    }
    
    /**
     * @dev Revoke access to a report
     */
    function revokeReportAccess(
        string memory doctorId,
        uint256 reportId
    ) external onlyAuthorizedDoctor(doctorId) reportExistsCheck(reportId) {
        bytes32 accessHash = keccak256(abi.encodePacked(doctorId, reportId));
        require(reportAccess[accessHash].hasAccess, "No access to revoke");
        
        reportAccess[accessHash].hasAccess = false;
        
        emit AccessRevoked(doctorId, medicalReports[reportId].patientId, reportId);
    }
    
    /**
     * @dev Get report metadata (encrypted)
     */
    function getReportMetadata(uint256 reportId) 
        external 
        view 
        reportExistsCheck(reportId) 
        returns (string memory) {
        return medicalReports[reportId].encryptedMetadata;
    }
    
    /**
     * @dev Get IPFS hash for a report
     */
    function getReportIPFSHash(uint256 reportId) 
        external 
        view 
        reportExistsCheck(reportId) 
        returns (string memory) {
        return medicalReports[reportId].ipfsHash;
    }
    
    /**
     * @dev Get all reports for a patient
     */
    function getPatientReports(string memory patientId) 
        external 
        view 
        returns (uint256[] memory) {
        return patientReports[patientId];
    }
    
    /**
     * @dev Get all reports accessible to a doctor
     */
    function getDoctorReports(string memory doctorId) 
        external 
        view 
        returns (uint256[] memory) {
        return doctorReports[doctorId];
    }
    
    /**
     * @dev Check if doctor has access to a report
     */
    function hasReportAccess(string memory doctorId, uint256 reportId) 
        external 
        view 
        returns (bool) {
        bytes32 accessHash = keccak256(abi.encodePacked(doctorId, reportId));
        return reportAccess[accessHash].hasAccess;
    }
    
    /**
     * @dev Update report metadata
     */
    function updateReportMetadata(
        uint256 reportId,
        string memory newMetadata
    ) external reportExistsCheck(reportId) {
        medicalReports[reportId].encryptedMetadata = newMetadata;
        emit MetadataUpdated(reportId, newMetadata);
    }
    
    /**
     * @dev Register a doctor
     */
    function registerDoctor(string memory doctorId) external onlyOwner {
        authorizedDoctors[doctorId] = true;
    }
    
    /**
     * @dev Register a patient
     */
    function registerPatient(string memory patientId) external onlyOwner {
        registeredPatients[patientId] = true;
    }
    
    /**
     * @dev Get report details
     */
    function getReportDetails(uint256 reportId) 
        external 
        view 
        reportExistsCheck(reportId) 
        returns (
            string memory patientId,
            string memory ipfsHash,
            string memory reportType,
            uint256 timestamp,
            bool isEncrypted
        ) {
        MedicalReportData memory report = medicalReports[reportId];
        return (
            report.patientId,
            report.ipfsHash,
            report.reportType,
            report.timestamp,
            report.isEncrypted
        );
    }
    
    /**
     * @dev Helper function to convert uint256 to string
     */
    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k -= 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
