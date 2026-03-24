const express = require("express");
const issueNoteController = require("../../controllers/issue-notes/issue-note-controller");
const issueNoteRouter = express.Router();

issueNoteRouter.get("/", issueNoteController.getAllIssueNotesWithItems)
    .get("/:id", issueNoteController.getIssueNoteByIdWithItems)
    .post("/", issueNoteController.createIssueNoteWithItems)
    .put("/:id", issueNoteController.updateIssueNoteWithItems)
    .delete("/:id", issueNoteController.deleteIssueNoteWithItems);

module.exports = issueNoteRouter;