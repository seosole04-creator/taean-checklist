/**
 * 여행 체크리스트 - 저장소 (구글 시트)
 * 이 파일은 구글 Apps Script 편집기에 붙여넣고 "웹 앱"으로 배포합니다.
 * 자세한 순서는 설정방법.md 참고.
 */

// 시트 안의 탭 이름 (없으면 자동으로 만들어집니다)
var SHEET_NAME = 'trips';

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['trip', 'data', 'updatedAt']);
  }
  return sh;
}

function findRow_(sh, trip) {
  var values = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(trip)) return i + 1;
  }
  return 0;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 읽기: ...exec?trip=taean-0912 */
function doGet(e) {
  try {
    var trip = (e && e.parameter && e.parameter.trip) || '';
    if (!trip) return json_({ ok: false, error: 'trip 값이 없습니다' });

    var sh = getSheet_();
    var row = findRow_(sh, trip);
    if (!row) return json_({ ok: true, data: null });

    var raw = sh.getRange(row, 2).getValue();
    return json_({
      ok: true,
      data: raw ? JSON.parse(raw) : null,
      updatedAt: sh.getRange(row, 3).getValue()
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** 쓰기: body = {"trip":"taean-0912","data":{...}} */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // 여러 명이 동시에 저장할 때 순서대로 처리
  } catch (lockErr) {
    return json_({ ok: false, error: '서버가 바빠요. 잠시 후 다시 시도해 주세요.' });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    var trip = body.trip;
    if (!trip || !body.data) return json_({ ok: false, error: 'trip 또는 data 없음' });

    var sh = getSheet_();
    var row = findRow_(sh, trip);
    var payload = JSON.stringify(body.data);
    var now = new Date();

    if (row) {
      sh.getRange(row, 2).setValue(payload);
      sh.getRange(row, 3).setValue(now);
    } else {
      sh.appendRow([trip, payload, now]);
    }
    return json_({ ok: true, updatedAt: now });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
