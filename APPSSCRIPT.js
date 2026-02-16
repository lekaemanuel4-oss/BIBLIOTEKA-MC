// ==============================
// Full Library Apps Script
// Handles: Books + Students + Admin actions
// ==============================

// ================= GET =================
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // -------- USERS GET --------
  if (e && e.parameter && e.parameter.type === "users") {
    const userSheet = ss.getSheetByName("userstd");
    if (!userSheet) return json([]);

    const data = userSheet.getDataRange().getValues();
    if (data.length < 2) return json([]);

    const headers = data[0];
    const rows = data.slice(1);

    const result = rows.map((row, i) => {
      let obj = {};
      headers.forEach((h, j) => obj[h] = row[j]);
      obj.rowIndex = i + 2; // actual row in sheet
      return obj;
    });

    return json(result);
  }

  // -------- BOOKS GET --------
  const sheet = ss.getSheetByName("Books");
  if (!sheet) return json([]);

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return json([]);

  const headers = data[0];
  const rows = data.slice(1);

  // Ensure Cop gjendje is synced before sending
  syncCopGjendje();

  const result = rows.map((row, i) => {
    let obj = {};
    headers.forEach((h, j) => obj[h] = row[j]);
    obj.rowIndex = i + 2; // actual row in sheet
    return obj;
  });

  return json(result);
}

// ================= POST =================
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents)
      throw new Error("No POST data found.");

    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ---------------- USERS ----------------
    const userSheet = ss.getSheetByName("userstd");
    if (!userSheet) throw new Error("Sheet 'userstd' not found.");

    const userData = userSheet.getDataRange().getValues();
    const userHeaders = userData[0];

    const idIndex = userHeaders.indexOf("ID");
    const usernameIndex = userHeaders.indexOf("Username");
    const passwordIndex = userHeaders.indexOf("Password");
    const emriIndex = userHeaders.indexOf("Emri");
    const mbiemriIndex = userHeaders.indexOf("Mbiemri");
    const roleIndex = userHeaders.indexOf("Role");
    const statusIndex = userHeaders.indexOf("Status");

    // ---------- SIGNUP ----------
    if (params.action === "signup") {
      const exists = userData.some(r => r[usernameIndex] === params.Username);
      if (exists) return json({ error: "Username already exists." });

      const newId = userSheet.getLastRow();
      userSheet.appendRow([
        newId,
        params.Username || "",
        params.Password || "",
        params.Emri || "",
        params.Mbiemri || "",
        "student",     // default role
        "Pending"      // default status
      ]);

      return json({ success: true });
    }

    // ---------- LOGIN ----------
    if (params.action === "login") {
      const userRow = userData.find(r =>
        r[usernameIndex] === params.Username &&
        r[passwordIndex] === params.Password
      );

      if (!userRow) return json({ error: "Wrong username or password." });
      if (userRow[statusIndex].toLowerCase() !== "approved") 
        return json({ error: "Account not approved yet." });

      return json({
        success: true,
        ID: userRow[idIndex],
        Username: userRow[usernameIndex],
        Emri: userRow[emriIndex],
        Mbiemri: userRow[mbiemriIndex],
        Role: userRow[roleIndex]
      });
    }

    // ---------------- BOOKS ----------------
    const sheet = ss.getSheetByName("Books");
    if (!sheet) throw new Error("Sheet 'Books' not found.");

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const reservedByIndex = headers.indexOf("Rezervuar Nga");
    const statusIndexBook = headers.indexOf("Status");
    const copIndex = headers.indexOf("Cop");
    const copGjendjeIndex = headers.indexOf("Cop gjendje");

    if (reservedByIndex === -1 || statusIndexBook === -1 || copIndex === -1 || copGjendjeIndex === -1)
      throw new Error("One or more required columns are missing in 'Books'!");

    // ---------- STUDENT RESERVATION ----------
    if (params.action === "requestReserve") {
      const row = params.row;
      const student = params.student;

      const hasActive = data.some(r =>
        r[reservedByIndex] == student &&
        ["Pending", "Reserved"].includes(r[statusIndexBook])
      );
      if (hasActive) return json({ error: "You can only reserve one book at a time." });

      let copGjendjeValue = data[row - 1][copGjendjeIndex];
      const totalCop = data[row - 1][copIndex];
      if(!copGjendjeValue || copGjendjeValue === "") copGjendjeValue = totalCop || 0;

      if (copGjendjeValue <= 0) return json({ error: "No copies available." });

      sheet.getRange(row, reservedByIndex + 1).setValue(student);
      sheet.getRange(row, statusIndexBook + 1).setValue("Pending");
      sheet.getRange(row, copGjendjeIndex + 1).setValue(copGjendjeValue - 1);

      return json({ success: true });
    }

    // ---------- ADMIN APPROVE RESERVATION ----------
    if (params.action === "approve") {
      sheet.getRange(params.row, statusIndexBook + 1).setValue("Reserved");
      return json({ success: true });
    }

    // ---------- ADMIN REJECT RESERVATION ----------
    if (params.action === "reject") {
      let currentCop = data[params.row - 1][copGjendjeIndex];
      const totalCop = data[params.row - 1][copIndex];
      if(!currentCop || currentCop === "") currentCop = totalCop || 0;

      sheet.getRange(params.row, copGjendjeIndex + 1).setValue(currentCop + 1);
      sheet.getRange(params.row, statusIndexBook + 1).setValue("");
      sheet.getRange(params.row, reservedByIndex + 1).setValue("");
      return json({ success: true });
    }

    // ---------- DELIVER BOOK ----------
    if (params.action === "delivered") {
      let currentCop = data[params.row - 1][copGjendjeIndex];
      const totalCop = data[params.row - 1][copIndex];
      if(!currentCop || currentCop === "") currentCop = totalCop || 0;

      sheet.getRange(params.row, copGjendjeIndex + 1).setValue(currentCop + 1);
      sheet.getRange(params.row, statusIndexBook + 1).setValue("Delivered");
      sheet.getRange(params.row, reservedByIndex + 1).setValue("");
      return json({ success: true });
    }

    // ---------- UPDATE STOCK ----------
    if (params.action === "updateStock") {
      sheet.getRange(params.row, copIndex + 1).setValue(params.Cop);
      sheet.getRange(params.row, copGjendjeIndex + 1).setValue(params.CopGjendje);
      return json({ success: true });
    }

    // ---------- CANCEL BY STUDENT ----------
    if (params.action === "cancelByStudent") {
      const row = params.row;
      const student = params.student;

      const reservedBy = data[row - 1][reservedByIndex];
      const status = data[row - 1][statusIndexBook];

      if(reservedBy !== student || status !== "Pending"){
        return json({error:"You can only cancel your own pending reservation."});
      }

      let currentCop = data[row - 1][copGjendjeIndex];
      const totalCop = data[row - 1][copIndex];
      if(!currentCop || currentCop === "") currentCop = totalCop || 0;

      sheet.getRange(row, copGjendjeIndex + 1).setValue(currentCop + 1);
      sheet.getRange(row, reservedByIndex + 1).setValue("");
      sheet.getRange(row, statusIndexBook + 1).setValue("");

      return json({success:true});
    }

    // ---------- ADD NEW BOOK ----------
    if (params.action === "addBook") {
      const newRow = [
        params.Nr || "",
        params.Titulli || "",
        params.Autori || "",
        params["Lloji i vepres"] || "",
        params["Shtepia botuese"] || "",
        params.Cop || 0,
        params["Cop gjendje"] || params.Cop || 0, // auto-fill if blank
        "", "", "" // Levizja, Rezervuar Nga, Status
      ];
      sheet.appendRow(newRow);
      return json({ success: true });
    }

    // ---------- EDIT EXISTING BOOK ----------
    if (params.action === "editBook") {
      const row = params.row; // row of the book in sheet
      if (params.Nr !== undefined) sheet.getRange(row, headers.indexOf("Nr") + 1).setValue(params.Nr);
      if (params.Titulli !== undefined) sheet.getRange(row, headers.indexOf("Titulli") + 1).setValue(params.Titulli);
      if (params.Autori !== undefined) sheet.getRange(row, headers.indexOf("Autori") + 1).setValue(params.Autori);
      if (params["Lloji i vepres"] !== undefined) sheet.getRange(row, headers.indexOf("Lloji i vepres") + 1).setValue(params["Lloji i vepres"]);
      if (params["Shtepia botuese"] !== undefined) sheet.getRange(row, headers.indexOf("Shtepia botuese") + 1).setValue(params["Shtepia botuese"]);
      return json({ success: true });
    }

    // ---------- APPROVE STUDENT ACCOUNT ----------
    if (params.action === "approveAccount") {
      const row = params.row;
      userSheet.getRange(row, statusIndex + 1).setValue("Approved");
      return json({ success: true });
    }

    // ---------- REJECT STUDENT ACCOUNT ----------
    if (params.action === "rejectAccount") {
      const row = params.row;
      userSheet.getRange(row, statusIndex + 1).setValue("Declined");
      return json({ success: true });
    }

    return json({ error: "Invalid action." });

  } catch (err) {
    return json({ error: err.message });
  }
}

// ================= SYNC COP GJENDJE =================
function syncCopGjendje() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Books");
  if(!sheet) return;

  const data = sheet.getDataRange().getValues();
  if(data.length < 2) return;

  const headers = data[0];
  const copIndex = headers.indexOf("Cop");
  const copGjendjeIndex = headers.indexOf("Cop gjendje");
  if(copIndex === -1 || copGjendjeIndex === -1) return;

  for(let i = 1; i < data.length; i++){
    if(data[i][copGjendjeIndex] === "" || data[i][copGjendjeIndex] == null){
      sheet.getRange(i+1, copGjendjeIndex+1).setValue(data[i][copIndex]);
    }
  }
}

// ================= HELPER =================
function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
