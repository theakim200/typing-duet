document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const typingArea = document.getElementById('typing-area');
    const textContainer = document.getElementById('text-container');
    const userCounter = document.getElementById('user-counter');
    const autoScrollToggle = document.getElementById('auto-scroll-toggle');
    const serverTimeDisplay = document.getElementById('server-time');
    
    // 상태 변수
    let serverStartTime = 0;
    let serverTimeOffset = 0;
    let userColor = '#000000';
    let autoScrollEnabled = true;
    let userScrolled = false;
    let currentLines = {}; // 라인별 관리
    const maxLineWidth = 760; // 라인 최대 너비
    
    // Socket.io 연결
    const socket = io();
    
    // 스크롤 이벤트 처리
    typingArea.addEventListener('scroll', () => {
        const isAtBottom = typingArea.scrollHeight - typingArea.scrollTop <= typingArea.clientHeight + 50;
        userScrolled = !isAtBottom;
    });
    
    // 자동 스크롤 토글
    autoScrollToggle.addEventListener('click', () => {
        autoScrollEnabled = !autoScrollEnabled;
        autoScrollToggle.textContent = `자동 스크롤: ${autoScrollEnabled ? '켜짐' : '꺼짐'}`;
        if (autoScrollEnabled) {
            userScrolled = false;
            scrollToBottom();
        }
    });
    
    // 소켓 이벤트: 초기화 데이터 수신
    socket.on('initialization', (data) => {
        console.log('초기화 데이터 수신:', data);
        
        // 서버 시간 초기화
        serverStartTime = data.serverStartTime;
        serverTimeOffset = Date.now() - data.currentServerTime;
        userColor = data.color;
        
        // 히스토리 렌더링
        if (data.messageHistory && data.messageHistory.length > 0) {
            renderMessageHistory(data.messageHistory);
        }
        
        // 사용자 카운터 업데이트
        userCounter.textContent = `접속자: ${data.onlineUsers}`;
        
        // 서버 시간 표시 시작
        updateServerTimeDisplay();
        setInterval(updateServerTimeDisplay, 1000);
    });
    
    // 소켓 이벤트: 사용자 카운트 업데이트
    socket.on('userCountUpdate', (data) => {
        userCounter.textContent = `접속자: ${data.onlineUsers}`;
    });
    
    // 소켓 이벤트: 시간 동기화
    socket.on('timeSync', (data) => {
        // 서버 시간 동기화
        serverTimeOffset = Date.now() - data.serverTime;
    });
    
    // 소켓 이벤트: 키 입력 수신
    socket.on('keypress', (data) => {
        // 키 입력 렌더링
        renderKeypress(data);
    });
    
// 모바일 입력 필드 참조
const mobileInput = document.getElementById('mobile-input');

// 페이지 어디든 클릭하면 모바일 입력 필드에 포커스
typingArea.addEventListener('click', () => {
    mobileInput.focus();
});

// 모바일 입력 필드의 입력 이벤트 처리
mobileInput.addEventListener('input', (event) => {
    const char = event.data;
    if (char && char.length === 1) {
        socket.emit('keypress', {
            character: char
        });
    }
    // 입력 필드 비우기 (다음 입력을 위해)
    mobileInput.value = '';
});

// 일반 키보드 이벤트도 계속 지원 (데스크톱용)
document.addEventListener('keydown', (event) => {
    // Backspace와 Enter 키 무시
    if (event.key === 'Backspace' || event.key === 'Enter') {
        event.preventDefault();
        return;
    }
    
    // 문자 키 처리
    if (event.key.length === 1) {
        socket.emit('keypress', {
            character: event.key
        });
    }
});

// 페이지 로드 시 자동으로 포커스 설정 (데스크톱과 모바일 모두)
window.addEventListener('load', () => {
    setTimeout(() => {
        mobileInput.focus();
    }, 1000);
});
    
    // 메시지 히스토리 렌더링
    function renderMessageHistory(history) {
        history.forEach(message => {
            renderKeypress(message);
        });
        scrollToBottom();
    }
    
    // 키 입력 렌더링
    function renderKeypress(data) {
        const lineIndex = calculateLineIndex(data.timestamp);
        const position = calculatePosition(data.timestamp);
        
        // 해당 라인이 없으면 생성
        if (!currentLines[lineIndex]) {
            createNewLine(lineIndex);
        }
        
        const line = currentLines[lineIndex];
        
        // 문자 요소 생성
        const charElement = document.createElement('span');
        charElement.className = 'char';
        charElement.textContent = data.character;
        charElement.style.color = data.color;
        charElement.style.position = 'absolute';
        charElement.style.left = `${position.x}px`;
        
        // 라인에 추가
        line.appendChild(charElement);
        
        // 자동 스크롤
        if (autoScrollEnabled && !userScrolled) {
            scrollToBottom();
        }
    }
    
    // 위치 계산
    function calculatePosition(timestamp) {
        // 서버 시작 시간으로부터의 경과 시간 (밀리초)
        const elapsedTime = timestamp - serverStartTime;
        
        // 시간을 위치로 변환 (120 픽셀/초 속도)
        const pixelsPerSecond = 120;
        
        // 총 픽셀 수 계산
        const totalPixels = (elapsedTime / 1000) * pixelsPerSecond;
        
        // x 좌표 계산 (최대 너비 이내)
        const x = totalPixels % maxLineWidth;
        
        return { x };
    }
    
    // 라인 인덱스 계산
    function calculateLineIndex(timestamp) {
        const elapsedTime = timestamp - serverStartTime;
        const pixelsPerSecond = 120;
        
        // 총 픽셀 수를 라인 너비로 나누어 라인 인덱스 계산
        const totalPixels = (elapsedTime / 1000) * pixelsPerSecond;
        return Math.floor(totalPixels / maxLineWidth);
    }
    
    // 새 라인 생성
    function createNewLine(index) {
        const line = document.createElement('div');
        line.className = 'line';
        line.style.position = 'relative';
        line.style.height = '36px';
        line.style.marginBottom = '5px';
        
        // 인덱스 순서에 맞게 삽입
        let inserted = false;
        const existingLines = textContainer.querySelectorAll('.line');
        
        if (existingLines.length > 0) {
            for (let i = 0; i < existingLines.length; i++) {
                const lineIndex = parseInt(existingLines[i].dataset.index || 0);
                if (index < lineIndex) {
                    textContainer.insertBefore(line, existingLines[i]);
                    inserted = true;
                    break;
                }
            }
        }
        
        if (!inserted) {
            textContainer.appendChild(line);
        }
        
        line.dataset.index = index;
        currentLines[index] = line;
        
        // 필요 시 오래된 라인 제거 (성능 최적화)
        pruneOldLines();
    }
    
    // 오래된 라인 제거
    function pruneOldLines() {
        const maxLines = 300; // 최대 라인 수 제한
        const lines = textContainer.querySelectorAll('.line');
        
        if (lines.length > maxLines) {
            const linesToRemove = lines.length - maxLines;
            for (let i = 0; i < linesToRemove; i++) {
                const oldestLine = lines[i];
                const index = oldestLine.dataset.index;
                textContainer.removeChild(oldestLine);
                delete currentLines[index];
            }
        }
    }
    
    // 맨 아래로 스크롤
    function scrollToBottom() {
        typingArea.scrollTop = typingArea.scrollHeight;
    }
    
    // 서버 시간 표시 업데이트
    function updateServerTimeDisplay() {
        const now = Date.now() - serverTimeOffset;
        const uptime = now - serverStartTime;
        
        // 업타임을 시:분:초 형식으로 변환
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        
        const formattedTime = 
            `${hours.toString().padStart(2, '0')}:${
            minutes.toString().padStart(2, '0')}:${
            seconds.toString().padStart(2, '0')}`;
        
        serverTimeDisplay.textContent = `서버 실행시간: ${formattedTime}`;
    }
});