// Coze API配置
const cozeConfig = {
  token: "pat_x8X38MRHfPsV01gD6aHnlJBS379WjiQRe21suebBgKdwktJVPpP1qjTuRR0NFXu4",
  botId: "7504275160636325942",
  apiUrl: "https://api.coze.cn/open_api/v2/chat"
};

// 游戏状态
const gameState = {
  currentStep: 'region-selection',
  selectedRegion: null,
  petDescription: "",
  petName: "",
  petImage: null,
  petVideo: null,
  conversationId: generateConversationId(),
  messages: [],
  regionPetsCache: {}
};

// 地域描述数据 - 提前定义
const regionData = {
    mountain: {
        name: "昆仑山脉",
        description: "冰雪覆盖的神秘山脉，栖息着冰系灵宠",
        icon: "fa-mountain"
    },
    forest: {
        name: "翡翠森林",
        description: "生机盎然的古老森林，木系灵宠的家园",
        icon: "fa-tree"
    },
    volcano: {
        name: "熔岩火山",
        description: "炽热活跃的火山地带，火系灵宠在此诞生",
        icon: "fa-fire"
    },
    ocean: {
        name: "无尽海洋",
        description: "深邃广阔的海洋世界，水系灵宠的乐园",
        icon: "fa-water"
    },
    desert: {
        name: "黄金沙漠",
        description: "炎热干燥的沙漠地带，土系灵宠的栖息地",
        icon: "fa-sun"
    },
    sky: {
        name: "天空之城",
        description: "悬浮在云端的秘境，风系灵宠在此翱翔",
        icon: "fa-cloud"
    }
};

// 生成随机会话ID
function generateConversationId() {
    return 'conv_' + Math.random().toString(36).substr(2, 9);
}

// 预加载的宠物数据
const preloadedPets = {
    mountain: [
        "冰晶狐：体型娇小，身披银蓝色毛发，阳光下闪烁冰晶光芒。冰蓝色眼睛，尾巴蓬松如云朵，末端有点缀的冰晶。行动时留下淡淡冰雾轨迹，性格温顺但警惕。",
        "雪域狼王：通体雪白，毛发如银丝般闪亮，双眼如蓝宝石。能操控冰雪，在暴风雪中行动自如。性格孤傲但忠诚，只服从认可的主人。"
    ],
    forest: [
        "翠叶精灵：身体由嫩叶和藤蔓组成，翅膀透明如蝉翼。能促进植物生长，治愈伤病。性格温和友善，喜欢在花丛中嬉戏。",
        "橡果守卫：外形像松鼠但体型更大，毛皮呈深棕色，尾巴蓬松。脸颊能储存魔力橡果，投掷橡果作为武器。性格机警，领地意识强。"
    ],
    volcano: [
        "熔岩蜥蜴：鳞片红黑相间如冷却的熔岩，尾巴末端燃烧不熄的火焰。能在岩浆中游泳，喷吐小火球。性格活泼好动，容易兴奋。",
        "火焰凤凰雏鸟：羽毛如流动的火焰，飞行时洒落火星。鸣叫能治愈灼伤，随着成长火焰会更旺盛。性格高贵但亲近主人。"
    ],
    ocean: [
        "水晶水母：伞盖透明闪烁蓝绿光，触手飘逸如丝带。能释放治愈光波，在水中优雅漂浮。性格宁静温和，喜欢随波逐流。",
        "海豚精灵：流线型身体，皮肤光滑，背鳍有发光晶体。擅长高速游泳，能发出超声波交流。性格友好爱玩，喜欢跃出水面。"
    ],
    desert: [
        "金砂狐：毛发如细沙般柔软金黄，眼睛琥珀色。能在沙中穿梭，控制沙粒形成各种形状。性格机警独立，但对主人忠诚。",
        "沙漠蝎王：甲壳暗金色，毒针闪烁寒光。力量强大，耐高温，甲壳能反射阳光。性格冷静沉着，是优秀守护者。"
    ],
    sky: [
        "云朵云雀：羽毛蓬松如云，翅膀边缘有彩虹色光芒。歌声清脆，能召唤微风细雨。性格活泼开朗，喜欢高空翱翔。",
        "风暴鹰：羽毛银灰色，眼睛如闪电明亮。能操控气流，翅膀扇动产生旋风。性格高傲威严，尊重强者。"
    ]
};

// 显示指定步骤
function showStep(stepId) {
    document.getElementById('region-selection').style.display = 'none';
    document.getElementById('pet-discovery').style.display = 'none';
    document.getElementById('naming-pet').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'none';
    document.getElementById(stepId).style.display = stepId === 'chat-interface' ? 'flex' : 'block';
    gameState.currentStep = stepId;
}

// 优化后的Coze API调用
async function callCozeAPI(message) {
    try {
        // 构建更明确的提示词避免插件调用
        const fullPrompt = `作为灵宠${gameState.petName}，请用可爱亲切的语气直接回答以下问题，不要调用任何插件：
${message}

回答要求：
1. 以第一人称回答
2. 保持语气活泼可爱
3. 不要使用任何插件功能
4. 回答长度在100字以内`;

        const requestData = {
            conversation_id: gameState.conversationId,
            bot_id: cozeConfig.botId,
            user: "user_123",
            query: fullPrompt,
            stream: false
        };

        gameState.messages.push({ role: "user", content: message });

        const response = await fetch(cozeConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cozeConfig.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);

        const data = await response.json();
        
        // 处理API响应，提取纯文本内容
        let aiResponse = "";
        if (data.messages && data.messages.length > 0) {
            // 直接取content内容，避免插件响应
            aiResponse = data.messages[0].content;
            
            // 如果返回的是JSON字符串，尝试解析
            try {
                const parsed = JSON.parse(aiResponse);
                if (typeof parsed === 'object' && parsed.content) {
                    aiResponse = parsed.content;
                }
            } catch (e) {
                // 不是JSON，保持原样
            }
        }
        
        // 如果内容仍包含插件信息，进行清理
        if (aiResponse.includes('plugin_id') || aiResponse.includes('arguments')) {
            aiResponse = "主人，我刚才走神了，能再问一次吗？";
        }

        if (!aiResponse) {
            aiResponse = "抱歉，我暂时没想到怎么回答这个问题。";
        }

        gameState.messages.push({ role: "assistant", content: aiResponse });
        return aiResponse;
    } catch (error) {
        console.error("调用Coze API出错:", error);
        return "网络不太稳定，请稍后再问我吧~";
    }
}

// 添加消息到聊天界面
function addMessageToChat(role, content) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `
        <div class="avatar">
            <i class="fas ${role === 'system' ? 'fa-dragon' : 'fa-user'}"></i>
        </div>
        <div class="content">
            ${content}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送消息函数
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (!message) return;

    // 添加用户消息到界面
    addMessageToChat('user', message);
    userInput.value = '';
    
    // 显示加载状态
    const loadingId = 'loading-' + Date.now();
    const loadingMessage = document.createElement('div');
    loadingMessage.id = loadingId;
    loadingMessage.className = 'message system';
    loadingMessage.innerHTML = `
        <div class="avatar">
            <i class="fas fa-dragon"></i>
        </div>
        <div class="content">
            <div class="loading-dots">
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>
    `;
    document.getElementById('messages').appendChild(loadingMessage);
    
    // 调用Coze API获取回复
    try {
        const response = await callCozeAPI(message);
        document.getElementById(loadingId)?.remove();
        addMessageToChat('system', response);
    } catch (error) {
        console.error("发送消息出错:", error);
        document.getElementById(loadingId)?.remove();
        addMessageToChat('system', "哎呀，我刚才走神了，能再说一次吗？");
    }
}

// 优化后的宠物数据获取 - 使用预加载数据
async function getPetsForRegion(region) {
    // 1. 先显示预加载数据
    const pets = [...preloadedPets[region] || []];
    
    // 2. 异步尝试从Coze获取更多数据（不等待）
    fetchPetsFromCoze(region).then(additionalPets => {
        if (additionalPets.length > 0) {
            // 更新缓存供下次使用
            gameState.regionPetsCache[region] = [...pets, ...additionalPets];
        }
    }).catch(error => {
        console.error("异步获取宠物数据失败:", error);
    });
    
    return pets;
}

// 异步从Coze获取额外宠物数据
async function fetchPetsFromCoze(region) {
    try {
        const regionName = regionData[region].name;
        const prompt = `请提供3种生活在${regionName}的灵宠描述，每种用50-70字中文描述外貌和性格，直接返回数组格式，不要额外说明，例如：
["描述1", "描述2", "描述3"]`;

        const response = await fetch(cozeConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cozeConfig.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                conversation_id: gameState.conversationId + '_pets_' + region,
                bot_id: cozeConfig.botId,
                user: "user_123",
                query: prompt,
                stream: false
            })
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (!data.messages || !data.messages[0]?.content) return [];
        
        try {
            // 安全解析JSON
            const content = data.messages[0].content;
            const parsed = JSON.parse(content.startsWith('[') ? content : `[${content}]`);
            return Array.isArray(parsed) ? parsed.filter(desc => desc.length > 20) : [];
        } catch (e) {
            console.error("解析宠物数据失败:", e);
            return [];
        }
    } catch (error) {
        console.error("获取宠物数据出错:", error);
        return [];
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    // 地域选择
    const regionCards = document.querySelectorAll('.region-card');
    const exploreBtn = document.getElementById('explore-btn');
    
    regionCards.forEach(card => {
        card.addEventListener('click', function() {
            regionCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            gameState.selectedRegion = this.dataset.region;
            exploreBtn.disabled = false;
        });
    });
    
    // 开始探索 - 修复regionData引用问题
    exploreBtn.addEventListener('click', async function() {
        if (!gameState.selectedRegion) return;
        
        showStep('pet-discovery');
        const regionName = regionData[gameState.selectedRegion].name;
        document.getElementById('region-name-display').textContent = regionName;
        
        // 立即显示预加载数据
        const pets = await getPetsForRegion(gameState.selectedRegion);
        const petDescriptionElement = document.getElementById('pet-description-text');
        
        if (pets.length > 0) {
            const randomPet = pets[Math.floor(Math.random() * pets.length)];
            petDescriptionElement.textContent = randomPet;
            gameState.petDescription = randomPet;
        } else {
            petDescriptionElement.textContent = "暂时没有找到灵宠，请换个地域试试~";
        }
    });
    
    // 尝试捕捉
    document.getElementById('catch-btn').addEventListener('click', function() {
        showStep('naming-pet');
    });
    
    // 命名确认 - 修复空引用问题
    document.getElementById('name-confirm-btn').addEventListener('click', function() {
        const nameInput = document.getElementById('pet-name-input');
        const petName = nameInput.value.trim();
        
        if (petName.length < 2 || petName.length > 12) {
            alert("请输入2-12个字符的灵宠名称");
            return;
        }
        
        gameState.petName = petName;
        document.getElementById('generating-indicator').style.display = 'block';
        
        // 更新名称显示 - 只更新实际存在的元素
        const petNameDisplay = document.getElementById('pet-name-display');
        const chatTitle = document.getElementById('chat-title');
        
        if (petNameDisplay) petNameDisplay.textContent = petName;
        if (chatTitle) chatTitle.textContent = petName;
        
        // 检查并更新聊天中的宠物名称（如果元素存在）
        const petNameChat = document.getElementById('pet-name-chat');
        if (petNameChat) petNameChat.textContent = petName;
        
        // 直接进入聊天界面
        setTimeout(() => {
            showStep('chat-interface');
            document.querySelector('.game-header').style.display = 'flex';
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
                chatMessages.style.backgroundImage = 
                    "url('https://img.freepik.com/free-vector/cute-fox-with-cub-cartoon-vector-icon-illustration_138676-2247.jpg')";
            }
        }, 1500);
    });
    
    // 发送消息
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    
    if (sendBtn && userInput) {
        sendBtn.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') sendMessage();
        });
    }
});
