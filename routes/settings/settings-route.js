const express = require("express");
const router = express.Router();
const settingsController = require("../../controllers/settings/settings-controller");

router.route("/company")
  .get(settingsController.getCompany)
  .put(settingsController.updateCompany);

router.get("/option-lists", settingsController.getOptionLists);
router.post("/option-lists/:listKey", settingsController.createOption);
router.put("/option-lists/:listKey/:id", settingsController.updateOption);

router.route("/bank-accounts")
  .get(settingsController.getBankAccounts)
  .post(settingsController.createBankAccount);
router.route("/bank-accounts/:id")
  .put(settingsController.updateBankAccount)
  .delete(settingsController.deleteBankAccount);
router.put("/bank-accounts/:id/default", settingsController.setDefaultBankAccount);

router.get("/document-numbering", settingsController.getNumberFormats);
router.put("/document-numbering/:docType", settingsController.updateNumberFormat);

module.exports = router;
