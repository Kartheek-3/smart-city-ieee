import os
import json
import hashlib
import time

try:
    from web3 import Web3
    import solcx
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False

# Global contract instance
_contract = None
_w3 = None
_account = None

def init_blockchain():
    """Compiles the Solidity contract and deploys it to the local web3[tester] node."""
    global _w3, _contract, _account
    if not HAS_WEB3:
        print("Web3 not installed. Blockchain features disabled.")
        return False

    try:
        # Install solc 0.8.20 if missing
        try:
            solcx.set_solc_version("0.8.20")
        except solcx.exceptions.SolcNotInstalled:
            print("Installing solc 0.8.20...")
            solcx.install_solc("0.8.20")
            solcx.set_solc_version("0.8.20")

        # Compile Contract
        contract_path = os.path.join(os.path.dirname(__file__), "..", "..", "blockchain", "SmartCityReports.sol")
        with open(contract_path, "r") as f:
            source = f.read()

        compiled_sol = solcx.compile_source(
            source,
            output_values=["abi", "bin"]
        )
        
        # Get the contract interface
        contract_id, contract_interface = compiled_sol.popitem()
        bytecode = contract_interface['bin']
        abi = contract_interface['abi']

        # Connect to Ethereum (using local Ganache node for IEEE demo zero-cost)
        _w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
        
        # Wait for connection
        retries = 5
        while not _w3.is_connected() and retries > 0:
            time.sleep(1)
            retries -= 1
            
        if not _w3.is_connected():
            raise Exception("Could not connect to Ganache on 127.0.0.1:8545")
            
        _w3.eth.default_account = _w3.eth.accounts[0]
        _account = _w3.eth.accounts[0]

        # Deploy Contract
        SmartCityReports = _w3.eth.contract(abi=abi, bytecode=bytecode)
        tx_hash = SmartCityReports.constructor().transact({'from': _account})
        tx_receipt = _w3.eth.wait_for_transaction_receipt(tx_hash)

        # Create contract instance
        _contract = _w3.eth.contract(
            address=tx_receipt.contractAddress,
            abi=abi
        )
        print(f"✅ Blockchain Contract deployed at: {tx_receipt.contractAddress}")
        return True
    except Exception as e:
        print(f"❌ Blockchain initialization failed: {e}")
        return False

def generate_hash(report_text):
    """Generates a SHA-256 hash of the report content."""
    return hashlib.sha256(str(report_text).encode('utf-8')).hexdigest()

def add_report_to_blockchain(report_id, report_hash):
    """Stores the report hash on the Ethereum blockchain."""
    if not _contract:
        return {"status": "error", "message": "Blockchain not initialized"}
    
    try:
        tx_hash = _contract.functions.addReport(str(report_id), str(report_hash)).transact({'from': _account})
        _w3.eth.wait_for_transaction_receipt(tx_hash)
        return {
            "status": "success",
            "tx_hash": _w3.to_hex(tx_hash)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_report_from_blockchain(report_id):
    """Retrieves the stored hash and timestamp from the blockchain."""
    if not _contract:
        return {"status": "error", "message": "Blockchain not initialized"}
        
    try:
        data = _contract.functions.getReport(str(report_id)).call()
        # data returns: (reportId, reportHash, timestamp)
        if not data[0]:
            return {"status": "not_found"}
            
        return {
            "status": "success",
            "reportId": data[0],
            "reportHash": data[1],
            "timestamp": data[2]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Auto-initialize when imported
if HAS_WEB3 and not _contract:
    init_blockchain()
