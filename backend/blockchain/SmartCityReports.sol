// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SmartCityReports {

    struct Report {
        string reportId;
        string reportHash;
        uint256 timestamp;
    }

    mapping(string => Report) public reports;

    function addReport(
        string memory _reportId,
        string memory _reportHash
    ) public {
        reports[_reportId] = Report(
            _reportId,
            _reportHash,
            block.timestamp
        );
    }

    function getReport(
        string memory _reportId
    ) public view returns(
        string memory,
        string memory,
        uint256
    ) {
        Report memory r = reports[_reportId];
        return(
            r.reportId,
            r.reportHash,
            r.timestamp
        );
    }
}
