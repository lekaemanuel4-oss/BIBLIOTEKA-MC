// ==============================
// Full Library Apps Script - COMPLETE VERSION (FIXED MULTI-COPY)
// Handles: Books + Students + Admin actions + History
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
      obj.rowIndex = i + 2; 
      return obj;
    });

    return json(result);
  }

  // -------- HISTORY GET --------
  if (e && e.parameter && e.parameter.type === "history") {
    const histSheet = ss.getSheetByName("Historiku");
    if (!histSheet) return json([]);

    const data = histSheet.getDataRange().getValues();
    if (data.length < 2) return json([]);

    const headers = data[0];
    const rows = data.slice(1);

    return json(rows.map(row => {
      let obj = {};
      headers.forEach((h, j) => obj[h] = row[j]);
      return obj;
    }));
  }

  // -------- NEW: RESERVATIONS GET (Për Adminin) --------
  if (e && e.parameter && e.parameter.type === "reservations") {
    const resSheet = ss.getSheetByName("Reservations");
    if (!resSheet) return json([]);

    const data = resSheet.getDataRange().getValues();
    if (data.length < 2) return json([]);

    const headers = data[0];
    const rows = data.slice(1);

    return json(rows.map((row, i) => {
      let obj = {};
      headers.forEach((h, j) => obj[h] = row[j]);
      obj.rowIndex = i + 2; 
      return obj;
    }));
  }

  // -------- BOOKS GET --------
  const sheet = ss.getSheetByName("Books");
  if (!sheet) return json([]);

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return json([]);

  const headers = data[0];
  const rows = data.slice(1);

  syncCopGjendje();

  const result = rows.map((row, i) => {
    let obj = {};
    headers.forEach((h, j) => obj[h] = row[j]);
    obj.rowIndex = i + 2; 
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
      const usernameExists = userData.some(r => r[usernameIndex] === params.Username);
      if (usernameExists) return json({ success: false, error: "Ky Username ekziston već." });

      const nameExists = userData.some(r => 
        r[emriIndex].toString().toLowerCase() === params.Emri.toLowerCase() && 
        r[mbiemriIndex].toString().toLowerCase() === params.Mbiemri.toLowerCase()
      );
      if (nameExists) return json({ success: false, error: "Ky student (Emër & Mbiemër) është regjistruar një herë." });

      const newId = userSheet.getLastRow();
      userSheet.appendRow([
        newId,
        params.Username || "",
        params.Password || "",
        params.Emri || "",
        params.Mbiemri || "",
        "student",     
        "Pending"      
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

    // ---------------- BOOKS & RESERVATIONS ----------------
    const sheet = ss.getSheetByName("Books");
    const resSheet = ss.getSheetByName("Reservations") || ss.insertSheet("Reservations");
    
    if (!sheet) throw new Error("Sheet 'Books' not found.");

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const copIndex = headers.indexOf("Cop");
    const copGjendjeIndex = headers.indexOf("Cop gjendje");

    // ---------- NEW STUDENT RESERVATION LOGIC ----------
    if (params.action === "requestReserve") {
      const row = Number(params.row); // Sigurohemi që është numër
      const student = params.student;

      const resData = resSheet.getDataRange().getValues();
      const hasActive = resData.some(r =>
        r[2] == student && ["Pending", "Reserved"].includes(r[3])
      );
      if (hasActive) return json({ error: "You can only reserve one book at a time." });

      let copGjendjeValue = Number(data[row - 1][copGjendjeIndex]);
      const totalCop = Number(data[row - 1][copIndex]);
      
      if(isNaN(copGjendjeValue)) copGjendjeValue = totalCop || 0;

      if (copGjendjeValue <= 0) return json({ error: "No copies available." });

      resSheet.appendRow([
        data[row - 1][0], // ID
        data[row - 1][1], // Titulli
        student,
        "Pending",
        new Date(),
        row               // Referenca e rreshtit
      ]);

      sheet.getRange(row, copGjendjeIndex + 1).setValue(copGjendjeValue - 1);
      
      return json({ success: true });
    }

    // ---------- ADMIN ACTIONS ----------
    if (params.action === "approve") {
      resSheet.getRange(params.row, 4).setValue("Reserved");
      return json({ success: true });
    }

    if (params.action === "reject") {
      const resRowData = resSheet.getRange(params.row, 1, 1, 6).getValues()[0];
      const bookRowIdx = Number(resRowData[5]); // Sigurohemi që është numër

      if (bookRowIdx) {
        let currentVal = sheet.getRange(bookRowIdx, copGjendjeIndex + 1).getValue();
        let currentCop = Number(currentVal) || 0;
        sheet.getRange(bookRowIdx, copGjendjeIndex + 1).setValue(currentCop + 1);
      }

      resSheet.deleteRow(params.row);
      return json({ success: true });
    }

    // ---------- DELIVERED (KTHEU LIBRIN) ----------
    if (params.action === "delivered") {
      const sheetHist = ss.getSheetByName("Historiku") || ss.insertSheet("Historiku");
      
      const rowData = resSheet.getRange(params.row, 1, 1, 6).getValues()[0];
      const idLibri = rowData[0];
      const titulli = rowData[1];
      const studenti = rowData[2];
      const dataMarrjes = rowData[4];
      const bookRowIdx = Number(rowData[5]); // Referenca e rreshtit te Books

      sheetHist.appendRow([
        titulli, 
        studenti, 
        dataMarrjes, 
        new Date(), 
        idLibri, 
        "Kthyer"
      ]);

      if (bookRowIdx) {
        let currentVal = sheet.getRange(bookRowIdx, copGjendjeIndex + 1).getValue();
        let currentGjendje = Number(currentVal) || 0;
        sheet.getRange(bookRowIdx, copGjendjeIndex + 1).setValue(currentGjendje + 1);
      }

      resSheet.deleteRow(params.row);
      return json({ success: true });
    }

    // ---------- UPDATE STOCK ----------
    if (params.action === "updateStock") {
      sheet.getRange(params.row, copIndex + 1).setValue(params.Cop);
      sheet.getRange(params.row, copGjendjeIndex + 1).setValue(params.CopGjendje);
      return json({ success: true });
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
        params["Cop gjendje"] || params.Cop || 0,
        "", "", "", "" 
      ];
      sheet.appendRow(newRow);
      return json({ success: true });
    }
    else if (action === 'deleteBook') {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Librat");
  // Kontrollojmë që rreshti është i vlefshëm për të shmangur fshirjen e kokës së tabelës
  if (row > 1) {
    sheet.deleteRow(row);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Rreshti i pavlefshëm" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

    // ---------- EDIT EXISTING BOOK ----------
    if (params.action === "editBook") {
      const row = params.row; 
      if (params.Nr !== undefined) sheet.getRange(row, headers.indexOf("Nr") + 1).setValue(params.Nr);
      if (params.Titulli !== undefined) sheet.getRange(row, headers.indexOf("Titulli") + 1).setValue(params.Titulli);
      if (params.Autori !== undefined) sheet.getRange(row, headers.indexOf("Autori") + 1).setValue(params.Autori);
      if (params["Lloji i vepres"] !== undefined) sheet.getRange(row, headers.indexOf("Lloji i vepres") + 1).setValue(params["Lloji i vepres"]);
      if (params["Shtepia botuese"] !== undefined) sheet.getRange(row, headers.indexOf("Shtepia botuese") + 1).setValue(params["Shtepia botuese"]);
      return json({ success: true });
    }

    // ---------- APPROVE/REJECT STUDENT ACCOUNT ----------
    if (params.action === "approveAccount") {
      userSheet.getRange(params.row, statusIndex + 1).setValue("Approved");
      return json({ success: true });
    }

    if (params.action === "rejectAccount") {
      userSheet.getRange(params.row, statusIndex + 1).setValue("Declined");
      return json({ success: true });
    }

    // ---------- DELETE ACCOUNT ----------
    if (params.action === "deleteAccount") {
      const targetUser = userSheet.getRange(params.row, 1, 1, userHeaders.length).getValues()[0];
      const fullName = targetUser[emriIndex] + " " + targetUser[mbiemriIndex];
      const resSheet = ss.getSheetByName("Reservations");
      const bookSheet = ss.getSheetByName("Books");

      if (resSheet) {
        const resData = resSheet.getDataRange().getValues();
        const hasActive = resData.some(r => r[2] === fullName && r[3] === "Reserved");
        if (hasActive) {
          return json({ success: false, error: "Ky student ka një libër të pashlyer! Nuk mund të fshihet." });
        }

        const bHeaders = bookSheet.getDataRange().getValues()[0];
        const cgIdx = bHeaders.indexOf("Cop gjendje");
        
        for (let i = resData.length - 1; i >= 1; i--) {
          if (resData[i][2] === fullName && resData[i][3] === "Pending") {
            const bRow = Number(resData[i][5]);
            if (bRow && cgIdx !== -1) {
              let val = bookSheet.getRange(bRow, cgIdx + 1).getValue();
              bookSheet.getRange(bRow, cgIdx + 1).setValue((Number(val) || 0) + 1);
            }
            resSheet.deleteRow(i + 1);
          }
        }
      }
      userSheet.deleteRow(params.row);
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