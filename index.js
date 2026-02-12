const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ⚠️ 여기에 카카오 REST API 키를 입력하세요!
const KAKAO_REST_API_KEY = "90dc15b2e9fca351c3def4c77b1e963c";

// ⚠️ Replit 주소가 나오면 여기를 수정하세요!
// 예시: https://이상룡서명시스템.replit.app
const REDIRECT_URI =
  "https://5fb21ee2-bfcb-47b9-b30c-bcb248a3e835-00-4e31lf0szuqx.sisko.replit.dev/oauth/callback";

// 서명자 명단을 저장할 배열 (메모리에 임시 저장)
let signatures = [];

// 메인 페이지
app.get("/", (req, res) => {
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
          max-width: 500px;
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
        .subtitle {
          color: #666;
          font-size: 16px;
          margin-bottom: 30px;
          line-height: 1.6;
        }
        .info-box {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin-bottom: 30px;
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
        .kakao-btn:hover {
          background: #FDD835;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(254, 229, 0, 0.4);
        }
        .kakao-icon {
          width: 24px;
          height: 24px;
        }
        .footer {
          margin-top: 30px;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🇰🇷 석주 이상룡 선생<br>공적 재심사 서명운동</h1>
        <p class="subtitle">독립운동가의 위대한 발자취를 기억하고<br>올바른 평가를 위해 서명해주세요</p>

        <div class="info-box">
          <p><strong>✅ 서명 방법:</strong></p>
          <p>1. 아래 카카오톡 로그인 버튼 클릭</p>
          <p>2. 카카오 계정으로 본인 인증</p>
          <p>3. 자동으로 서명 완료!</p>
        </div>

        <button class="kakao-btn" onclick="loginWithKakao()">
          <svg class="kakao-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.8 6.7-.2.8-.8 3-.9 3.4 0 0 0 .3.2.4.1.1.3 0 .3 0 .5-.1 3.7-2.4 4.3-2.8.4.1.9.1 1.3.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" fill="currentColor"/>
          </svg>
          카카오톡으로 서명하기
        </button>

        <p class="footer">개인정보는 서명 목적으로만 사용되며<br>안전하게 보호됩니다</p>
      </div>

      <script>
        function loginWithKakao() {
          const kakaoAuthUrl = 'https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code';
          window.location.href = kakaoAuthUrl;
        }
      </script>
    </body>
    </html>
  `);
});

// 카카오 로그인 후 돌아오는 페이지
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send("❌ 로그인에 실패했습니다. 다시 시도해주세요.");
  }

  try {
    // 1단계: 카카오에게 "이 코드로 토큰 주세요" 요청
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
      },
    );

    const accessToken = tokenResponse.data.access_token;

    // 2단계: 토큰으로 사용자 정보 가져오기
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userName = userResponse.data.kakao_account.profile.nickname;
    const userId = userResponse.data.id;
    const signedAt = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });

    // 서명자 정보 저장
    const signature = {
      이름: userName,
      카카오ID: userId,
      서명시간: signedAt,
    };

    signatures.push(signature);

    // 텍스트 파일로도 저장
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

    // 콘솔에도 출력 (Replit 로그 확인용)
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

// 서명 명단 확인 페이지
app.get("/admin", (req, res) => {
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
        <div class="count">총 ${signatures.length}명이 서명했습니다</div>
        ${signatures.length > 0 ? listHtml : "<p>아직 서명자가 없습니다.</p>"}
      </div>
    </body>
    </html>
  `);
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 시작되었습니다!`);
  console.log(`📱 접속 주소: http://localhost:${PORT}`);
  console.log(`👨‍💼 관리자 페이지: http://localhost:${PORT}/admin`);
});
