const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const app = express();
const PORT = 3000;

// 카카오 설정
const KAKAO_REST_API_KEY = "90dc15b2e9fca351c3def4c77b1e963c";
const REDIRECT_URI = "https://leesangyong.onrender.com/oauth/callback";

// Google Sheets 설정
const SPREADSHEET_ID = "102gF824fJ_IX3LriUMQUtjRE7wkJI_KYMWLTvvkGStU";
const SHEET_NAME = "시트1";

// Google Sheets API 인증
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// 서명자 명단을 저장할 배열
let signatures = [];

// 오프라인 서명 인원 (시트2!B1 에서 읽어옴)
let offlineSignatures = 0;

// ============================================
// Google Sheets 함수들
// ============================================

// Google Sheets에서 기존 서명 불러오기
async function loadSignaturesFromSheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });

    const rows = response.data.values || [];
    signatures = rows.map((row) => ({
      이름: row[1] || "",
      카카오ID: String(row[2] || ""),
      서명시간: row[3] || "",
    }));

    console.log(`📊 Google Sheets에서 ${signatures.length}개 서명 불러옴`);
  } catch (error) {
    console.error("❌ Google Sheets 불러오기 실패:", error.message);
  }
}

// 시트2!B1 에서 오프라인 서명 인원 불러오기
async function loadOfflineCount() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `시트2!B1`,
    });

    const value = response.data.values?.[0]?.[0];
    offlineSignatures = parseInt(value) || 0;

    console.log(`✍️ 오프라인 서명 인원: ${offlineSignatures}명`);
  } catch (error) {
    console.error("❌ 오프라인 인원 불러오기 실패:", error.message);
    offlineSignatures = 0;
  }
}

// Google Sheets에 새 서명 추가
async function addSignatureToSheet(signature) {
  try {
    const values = [
      [
        signatures.length,
        signature.이름,
        signature.카카오ID,
        signature.서명시간,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: "RAW",
      resource: { values },
    });

    console.log("✅ Google Sheets에 저장 완료!");
  } catch (error) {
    console.error("❌ Google Sheets 저장 실패:", error.message);
  }
}

// ============================================
// 메인 페이지
// ============================================
app.get("/", async (req, res) => {
  // 페이지 로드마다 오프라인 인원 최신값 반영
  await loadOfflineCount();

  const totalSignatures = signatures.length + offlineSignatures;

  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>석주 이상룡 선생 재심사 서명</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Malgun Gothic', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px 30px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
        }
        h1 {
          color: #333;
          font-size: 24px;
          margin-bottom: 10px;
          line-height: 1.4;
        }
        .signature-count {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 25px;
          border-radius: 50px;
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0;
          display: inline-block;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          animation: pulse 2s infinite;
        }
        .count-number {
          font-size: 32px;
          font-weight: 900;
          margin: 0 5px;
          color: #FEE500;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .subtitle {
          color: #666;
          font-size: 16px;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        
        /* 접을 수 있는 역사 섹션 */
        .collapsible-section {
          margin: 20px 0;
          text-align: left;
        }
        .collapsible-header {
          background: #f8f9fa;
          border: 2px solid #667eea;
          border-radius: 10px;
          padding: 15px 20px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s;
        }
        .collapsible-header:hover {
          background: #e9ecef;
        }
        .collapsible-header strong {
          color: #667eea;
          font-size: 16px;
        }
        .collapsible-icon {
          font-size: 20px;
          transition: transform 0.3s;
        }
        .collapsible-icon.open {
          transform: rotate(180deg);
        }
        .collapsible-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.5s ease-out;
          background: #f8f9fa;
          border-radius: 0 0 10px 10px;
        }
        .collapsible-content.open {
          max-height: 2000px;
          transition: max-height 0.8s ease-in;
        }
        .collapsible-inner {
          padding: 20px;
          line-height: 1.8;
          color: #444;
          font-size: 14px;
        }
        .collapsible-inner h3 {
          color: #667eea;
          font-size: 16px;
          margin: 20px 0 10px 0;
        }
        .collapsible-inner h3:first-child {
          margin-top: 0;
        }
        .collapsible-inner p {
          margin-bottom: 15px;
        }
        
        /* 개인정보 동의 박스 */
        .privacy-box {
          background: #e8f5e9;
          border: 2px solid #4caf50;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          text-align: left;
        }
        .privacy-box h3 {
          color: #2e7d32;
          font-size: 16px;
          margin-bottom: 15px;
        }
        .privacy-content {
          color: #333;
          font-size: 13px;
          line-height: 1.8;
        }
        .privacy-content strong {
          color: #2e7d32;
          display: block;
          margin-top: 12px;
          margin-bottom: 5px;
        }
        .privacy-content ul {
          margin: 8px 0 8px 20px;
        }
        .privacy-content li {
          margin: 5px 0;
        }
        
        /* 체크박스 동의 */
        .consent-checkbox {
          background: white;
          border: 2px solid #4caf50;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        .consent-checkbox:hover {
          background: #f1f8f4;
        }
        .consent-checkbox input[type="checkbox"] {
          width: 20px;
          height: 20px;
          margin-right: 12px;
          cursor: pointer;
        }
        .consent-checkbox label {
          color: #333;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          flex: 1;
        }
        
        .info-box {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin-bottom: 20px;
          text-align: left;
        }
        .info-box p {
          margin: 10px 0;
          color: #555;
          font-size: 14px;
        }
        
        .kakao-btn {
          background: #FEE500;
          color: #000000;
          border: none;
          padding: 16px 40px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .kakao-btn:hover:not(:disabled) {
          background: #FDD835;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(254, 229, 0, 0.4);
        }
        .kakao-btn:disabled {
          background: #ccc;
          color: #666;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .kakao-icon {
          width: 24px;
          height: 24px;
        }
        .footer {
          margin-top: 20px;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🇰🇷 석주 이상룡 선생<br>공적 재심사 서명운동</h1>

        <div class="signature-count">
          <span class="count-number">${totalSignatures}</span>명이 참여했습니다
        </div>

        <p class="subtitle">석주 이상룡 선생의 업적을 기억하고<br>공적의 올바른 평가를 위해 서명에 참여해주세요</p>

        <!-- 접을 수 있는 역사 설명 섹션 -->
        <div class="collapsible-section">
          <div class="collapsible-header" onclick="toggleCollapsible()">
            <strong>📜 잃어버린 역사의 무게를 제자리로</strong>
            <span class="collapsible-icon" id="collapseIcon">▼</span>
          </div>
          <div class="collapsible-content" id="historyContent">
            <div class="collapsible-inner">
              <p style="font-weight: bold; color: #667eea; text-align: center; margin-bottom: 15px;">
                '석주 이상룡 선생 공적 재심사 국민 청원'
              </p>
              
              <h3>■ 통합과 화합으로 독립운동을 이끈 거목, 석주 이상룡</h3>
              <p>안동의 유서 깊은 종택 임청각의 주인 석주 이상룡 선생. 나라를 빼앗기자 400년 고성이씨 종택과 기득권을 뒤로하고 만주로 향했습니다. 선생이 전 재산을 바쳐 세운 '신흥무관학교'는 훗날 청산리·봉오동 전투를 승리로 이끈 독립군의 뿌리가 되었으며, 선생은 대한민국 임시정부의 초대 국무령(국가수반)으로서 분열된 독립운동 세력을 하나로 묶는 구심점이 되셨습니다.</p>
              <p>"나라를 찾기 전에는 내 유골을 고국으로 가져가지 마라"는 처절한 유언을 남긴 채 타국에서 생을 마감하기까지, 선생의 삶은 오직 조국의 완전한 독립만을 향해 있었습니다.</p>
              
              <h3>■ 멈춰버린 역사, 이제는 바로잡아야 합니다</h3>
              <p>광복 80주년을 맞이했지만, 선생에 대한 역사적 예우는 1962년 건국훈장 수여 당시의 기준에 머물러 있습니다.</p>
              <p>대한민국 임시정부의 수장이자 만주 독립운동의 개척자라는 독보적인 위상에도 불구하고, 당시 심사 과정에서 선생의 구체적인 활동과 영향력이 충분히 반영되지 못했습니다.</p>
              <p>수훈 이후 수십 년간 발굴된 수많은 사료는 선생의 공적이 기존의 평가보다 훨씬 광범위하고 깊었음을 입증하고 있습니다.</p>
              <p>우리가 추진하는 공적 재심사는 단순한 등급 상향이 아닙니다. 잘못 채워진 첫 단추를 바로잡아 국가 상훈 제도의 공정성을 회복하고, 선열의 희생에 국가가 정당하게 응답하는 정의를 실현하는 일입니다.</p>
              
              <h3>■ 역사적 재평가를 위해 여러분의 참여가 필요합니다</h3>
              <p>나라를 위해 400년 종택을 뒤로하고 가족들과 독립운동에 나선 석주 이상룡. 이제는 선생의 노력에 보답할 차례입니다.</p>
              <p>독립운동의 격에 맞는 예우, 그것이 후손인 우리가 순국선열께 드릴 수 있는 최고의 감사입니다. 지금 바로 온라인 서명에 동참하여, 멈춰있던 선생의 역사를 다시 움직여 주십시오.</p>
            </div>
          </div>
        </div>

        <div class="info-box">
          <p><strong>✅ 서명 방법:</strong></p>
          <p>1. 아래 개인정보 수집 동의</p>
          <p>2. 카카오톡 로그인 버튼 클릭</p>
          <p>3. 카카오 계정으로 본인 인증</p>
          <p>4. 자동으로 서명 완료!</p>
        </div>

        <!-- 개인정보 동의 박스 -->
        <div class="privacy-box">
          <h3>🔒 개인정보 수집 및 이용 동의</h3>
          <div class="privacy-content">
            <p>석주 이상룡 선생 공적 재심사를 위한 '현대판 영남만인소' 서명 운동은 개인정보보호법에 의거하여 참여자의 소중한 정보를 안전하게 관리합니다.</p>
            
            <strong>1. 수집 및 이용 목적</strong>
            <ul>
              <li>독립유공자(석주 이상룡 선생) 공적 재심사 청원을 위한 본인 확인 및 연대 서명 명부 작성</li>
              <li>국가보훈부 등 관련 기관 제출용 청원 인원 산정</li>
            </ul>
            
            <strong>2. 수집 항목</strong>
            <ul>
              <li>성명, 카카오톡 ID(고유 식별값)</li>
              <li>(인증 시 제공되는 정보는 서명 중복 방지 및 본인 확인을 위한 최소한의 정보입니다.)</li>
            </ul>
            
            <strong>3. 보유 및 이용 기간</strong>
            <ul>
              <li>수집 시점부터 청원서 최종 제출 및 행정 절차 완료 시까지</li>
              <li>(청원 목적 달성 후, 수집된 개인정보는 지체 없이 파기됩니다.)</li>
            </ul>
            
            <strong>4. 동의 거부 권리</strong>
            <ul>
              <li>귀하는 개인정보 수집 및 이용 동의를 거부할 권리가 있습니다.</li>
              <li>단, 동의 거부 시 온라인 서명 참여가 제한될 수 있습니다.</li>
            </ul>
          </div>
        </div>

        <!-- 동의 체크박스 -->
        <div class="consent-checkbox" onclick="toggleConsent()">
          <input type="checkbox" id="privacyConsent" onclick="event.stopPropagation(); toggleConsent()">
          <label for="privacyConsent">개인정보 수집 및 이용에 동의합니다</label>
        </div>

        <button class="kakao-btn" id="kakaoBtn" onclick="loginWithKakao()" disabled>
          <svg class="kakao-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.8 6.7-.2.8-.8 3-.9 3.4 0 0 0 .3.2.4.1.1.3 0 .3 0 .5-.1 3.7-2.4 4.3-2.8.4.1.9.1 1.3.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" fill="currentColor"/>
          </svg>
          카카오톡으로 서명하기
        </button>

        <p class="footer">개인정보는 서명 목적으로만 사용되며<br>안전하게 보호됩니다</p>
      </div>

      <script>
        // 역사 섹션 펼치기/접기
        function toggleCollapsible() {
          const content = document.getElementById('historyContent');
          const icon = document.getElementById('collapseIcon');
          
          if (content.classList.contains('open')) {
            content.classList.remove('open');
            icon.classList.remove('open');
          } else {
            content.classList.add('open');
            icon.classList.add('open');
          }
        }

        // 개인정보 동의 체크박스
        function toggleConsent() {
          const checkbox = document.getElementById('privacyConsent');
          const kakaoBtn = document.getElementById('kakaoBtn');
                   
          if (checkbox.checked) {
            kakaoBtn.disabled = false;
          } else {
            kakaoBtn.disabled = true;
          }
        }

        // 카카오 로그인
        function loginWithKakao() {
          const checkbox = document.getElementById('privacyConsent');
          
          if (!checkbox.checked) {
            alert('개인정보 수집 및 이용에 동의해주세요.');
            return;
          }
          
          const kakaoAuthUrl = 'https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code';
          window.location.href = kakaoAuthUrl;
        }
      </script>
    </body>
    </html>
  `);
});

// ============================================
// 카카오 로그인 후 돌아오는 페이지
// ============================================
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send("❌ 로그인에 실패했습니다. 다시 시도해주세요.");
  }

  try {
    // 1단계: 카카오에게 토큰 요청
    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: KAKAO_REST_API_KEY,
          redirect_uri: REDIRECT_URI,
          code: code,
        },
        headers: {
          "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2단계: 토큰으로 사용자 정보 가져오기
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userName = userResponse.data.kakao_account.profile.nickname;
    const userId = String(userResponse.data.id);
    const signedAt = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });

    // 중복 서명 확인
    const alreadySigned = signatures.find((sig) => sig.카카오ID === userId);

    if (alreadySigned) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>이미 서명 완료</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Malgun Gothic', sans-serif;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 50px 30px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            .icon {
              font-size: 80px;
              margin-bottom: 20px;
            }
            h1 {
              color: #f5576c;
              font-size: 28px;
              margin-bottom: 20px;
            }
            .message {
              color: #666;
              font-size: 18px;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            .info-box {
              background: #fff5f5;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .info-box p {
              color: #555;
              margin: 10px 0;
              font-size: 14px;
            }
            .btn {
              background: #f5576c;
              color: white;
              border: none;
              padding: 16px 40px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s;
            }
            .btn:hover {
              background: #e0455a;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⚠️</div>
            <h1>이미 서명하셨습니다</h1>
            <p class="message">${userName}님은 이미 서명을 완료하셨습니다</p>

            <div class="info-box">
              <p><strong>기존 서명 정보</strong></p>
              <p>서명 시간: ${alreadySigned.서명시간}</p>
              <p>중복 서명은 불가능합니다</p>
            </div>

            <button class="btn" onclick="window.close()">창 닫기</button>
          </div>
        </body>
        </html>
      `);
    }

    // 서명자 정보 저장
    const signature = {
      이름: userName,
      카카오ID: userId,
      서명시간: signedAt,
    };

    signatures.push(signature);

    // Google Sheets에 저장
    await addSignatureToSheet(signature);

    // 텍스트 파일로도 저장 (백업용)
    const signatureText = `${signatures.length}. ${userName} (ID: ${userId}) - ${signedAt}\n`;
    fs.appendFileSync("서명명단.txt", signatureText, "utf8");

    // 성공 페이지 표시
    res.send(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>서명 완료</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Malgun Gothic', sans-serif;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 50px 30px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
          }
          .success-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: bounce 1s;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          h1 {
            color: #11998e;
            font-size: 28px;
            margin-bottom: 20px;
          }
          .name {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .message {
            color: #666;
            font-size: 18px;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          .info-box {
            background: #f0f9ff;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .info-box p {
            color: #555;
            margin: 10px 0;
            font-size: 14px;
          }
          .btn {
            background: #11998e;
            color: white;
            border: none;
            padding: 16px 40px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
          }
          .btn:hover {
            background: #0d7a6f;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>서명이 완료되었습니다!</h1>
          <div class="name">${userName}님</div>
          <p class="message">석주 이상룡 선생의 공적 재심사를 위한<br>소중한 서명에 감사드립니다</p>

          <div class="info-box">
            <p><strong>서명 정보</strong></p>
            <p>서명 번호: ${signatures.length}번째</p>
            <p>서명 시간: ${signedAt}</p>
          </div>

          <button class="btn" onclick="window.close()">창 닫기</button>
        </div>
      </body>
      </html>
    `);

    console.log(`✅ 새 서명: ${userName} (총 ${signatures.length}명)`);
  } catch (error) {
    console.error("오류 발생:", error.message);
    res.send(`
      <h1>❌ 오류가 발생했습니다</h1>
      <p>잠시 후 다시 시도해주세요.</p>
      <p>오류 내용: ${error.message}</p>
    `);
  }
});

// ============================================
// 서명 명단 확인 페이지
// ============================================
app.get("/admin", (req, res) => {
  const totalSignatures = signatures.length + offlineSignatures;

  let listHtml = "<ol>";
  signatures.forEach((sig) => {
    listHtml += `<li>${sig.이름} (ID: ${sig.카카오ID}) - ${sig.서명시간}</li>`;
  });
  listHtml += "</ol>";

  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>서명 명단 관리</title>
      <style>
        body {
          font-family: 'Malgun Gothic', sans-serif;
          padding: 40px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          max-width: 800px;
          margin: 0 auto;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        .count {
          font-size: 24px;
          color: #667eea;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .count-detail {
          font-size: 14px;
          color: #888;
          margin-bottom: 20px;
        }
        ol {
          line-height: 2;
        }
        li {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📋 서명 명단</h1>
        <div class="count">총 ${totalSignatures}명이 서명했습니다</div>
        <div class="count-detail">
          온라인 서명: ${signatures.length}명 &nbsp;|&nbsp; 수기(오프라인) 서명: ${offlineSignatures}명
        </div>
        ${signatures.length > 0 ? listHtml : "<p>아직 온라인 서명자가 없습니다.</p>"}
      </div>
    </body>
    </html>
  `);
});

// ============================================
// 서버 시작
// ============================================
app.listen(PORT, async () => {
  console.log(`🚀 서버가 시작되었습니다!`);
  console.log(`📱 접속 주소: http://localhost:${PORT}`);
  console.log(`👨‍💼 관리자 페이지: http://localhost:${PORT}/admin`);

  await loadSignaturesFromSheet();
  await loadOfflineCount();
});
