// 필요한 모듈 불러오기
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Express 앱 생성
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

// 서버 시작 시간 (절대 시간 기준점)
const SERVER_START_TIME = Date.now();

// 상태 변수
let onlineUsers = 0;
let messageHistory = [];

// 소켓 연결 처리
io.on('connection', (socket) => {
  // 사용자 연결 처리
  onlineUsers++;
  console.log('새 사용자 연결됨. 총 인원:', onlineUsers);
  
  // 사용자 색상 (랜덤 생성)
  const userColor = getRandomColor();
  
  // 초기 데이터 전송
  socket.emit('initialization', {
    serverStartTime: SERVER_START_TIME,
    currentServerTime: Date.now(),
    messageHistory: messageHistory.slice(-100), // 최근 100개 메시지만 전송
    color: userColor,
    onlineUsers: onlineUsers
  });
  
  // 모든 사용자에게 온라인 카운트 업데이트
  io.emit('userCountUpdate', { onlineUsers });
  
  // 키 입력 이벤트 수신 및 브로드캐스트
  socket.on('keypress', (data) => {
    const messageData = {
      character: data.character,
      timestamp: Date.now(), // 서버 타임스탬프
      userId: socket.id,
      color: userColor
    };
    
    // 히스토리에 저장
    messageHistory.push(messageData);
    
    // 최대 1000개 메시지만 유지
    if (messageHistory.length > 1000) {
      messageHistory = messageHistory.slice(-1000);
    }
    
    // 모든 클라이언트에 브로드캐스트
    io.emit('keypress', messageData);
  });
  
  // 주기적으로 서버 시간 전송 (시간 동기화)
  const timeInterval = setInterval(() => {
    socket.emit('timeSync', {
      serverTime: Date.now()
    });
  }, 5000);
  
  // 연결 해제
  socket.on('disconnect', () => {
    onlineUsers--;
    console.log('사용자 연결 해제. 총 인원:', onlineUsers);
    io.emit('userCountUpdate', { onlineUsers });
    clearInterval(timeInterval);
  });
});

// 색상 생성 함수
function getRandomColor() {
  // 가독성 좋은 컬러 세트
  const colors = [
    '#FF5733', // 빨강
    '#33FF57', // 녹색
    '#3357FF', // 파랑
    '#FF33F5', // 핑크
    '#F5B533', // 황색
    '#33F5E0'  // 청록
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`http://localhost:${PORT}에서 확인하세요`);
});