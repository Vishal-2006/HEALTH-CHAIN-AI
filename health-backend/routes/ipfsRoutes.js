const express = require('express');
const router = express.Router();
const ipfsService = require('../services/ipfsService');

// GET /api/ipfs/status - Check IPFS node status
router.get('/status', async (req, res) => {
    try {
        const isOnline = await ipfsService.isOnline();
        
        if (isOnline) {
            const nodeInfo = await ipfsService.getNodeInfo();
            res.json({
                success: true,
                online: true,
                gateway: process.env.IPFS_GATEWAY_URL || 'https://dweb.link',
                pathGateway: process.env.IPFS_PATH_GATEWAY || 'https://ipfs.io',
                apiUrl: process.env.IPFS_API_URL || 'http://127.0.0.1:5002',
                nodeId: nodeInfo?.id || 'Unknown',
                version: nodeInfo?.agentVersion || 'Unknown',
                addresses: nodeInfo?.addresses || []
            });
        } else {
            res.json({
                success: false,
                online: false,
                error: 'IPFS node not accessible',
                apiUrl: process.env.IPFS_API_URL || 'http://127.0.0.1:5002'
            });
        }
    } catch (error) {
        console.error('IPFS status check failed:', error);
        res.status(500).json({
            success: false,
            online: false,
            error: error.message,
            apiUrl: process.env.IPFS_API_URL || 'http://127.0.0.1:5002'
        });
    }
});

// POST /api/ipfs/upload - Upload file to IPFS
router.post('/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }

        const file = req.files.file;
        const result = await ipfsService.uploadFile(file.data, file.name);

        if (result.success) {
            // Pin the file to keep it available
            await ipfsService.pinFile(result.hash);
            
            res.json({
                success: true,
                hash: result.hash,
                size: result.size,
                name: result.name,
                gatewayUrls: ipfsService.getGatewayUrls(result.hash)
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('File upload failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/ipfs/upload-json - Upload JSON data to IPFS
router.post('/upload-json', async (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'No data provided'
            });
        }

        const result = await ipfsService.uploadJSON(data);

        if (result.success) {
            // Pin the data to keep it available
            await ipfsService.pinFile(result.hash);
            
            res.json({
                success: true,
                hash: result.hash,
                size: result.size,
                gatewayUrls: ipfsService.getGatewayUrls(result.hash)
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('JSON upload failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/ipfs/file/:hash - Get file from IPFS
router.get('/file/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const result = await ipfsService.getFile(hash);

        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                gatewayUrls: ipfsService.getGatewayUrls(hash)
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('File retrieval failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/ipfs/info/:hash - Get file information
router.get('/info/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const result = await ipfsService.getFileStatus(hash);

        if (result.success) {
            res.json({
                success: true,
                hash,
                size: result.size,
                cumulativeSize: result.cumulativeSize,
                blocks: result.blocks,
                type: result.type,
                gatewayUrls: ipfsService.getGatewayUrls(hash)
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('File info retrieval failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/ipfs/pin/:hash - Pin file to IPFS
router.post('/pin/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const result = await ipfsService.pinFile(hash);

        if (result.success) {
            res.json({
                success: true,
                hash,
                pinned: result.pinned,
                message: result.pinned ? 'File pinned successfully' : 'File already pinned'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('File pinning failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
