const { Document } = require('../models');

/**
 * 查询归档文档列表
 */
async function getArchivedDocuments(req, res) {
    try {
        const { title, uploader_id } = req.query;

        const documents = Document.findArchived({
            title,
            uploaderId: uploader_id ? parseInt(uploader_id) : null
        });

        res.json(documents.map(d => ({
            id: d.id,
            title: d.title,
            originalFilename: d.original_filename,
            uploaderName: d.uploader_name,
            archivedAt: d.archived_at
        })));
    } catch (err) {
        console.error('查询归档文档错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
}

module.exports = {
    getArchivedDocuments
};
