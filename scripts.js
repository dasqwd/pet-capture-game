// 游戏状态
const gameState = {
    currentStep: 'region-selection',
    selectedRegion: null,
    petDescription: "",
    petName: "",
    petImage: null,
    petVideo: null
};

// 地域描述数据
const regionData = {
    mountain: {
        name: "昆仑山脉",
        description: "冰雪覆盖的神秘山脉，栖息着冰系灵宠",
        icon: "fa-mountain",
        pets: [
            "这是一只体型娇小的灵宠，身披银蓝色毛发，在阳光下闪烁着冰晶般的光芒。它有一双深邃的冰蓝色眼睛，尾巴蓬松如云朵，末端点缀着几颗闪烁的冰晶。行动时会在身后留下一道淡淡的冰雾轨迹，性格温顺但警惕性高。",
            "一只优雅的冰晶凤凰，翅膀由无数冰棱组成，飞行时洒下闪烁的冰晶。它的鸣叫声清脆如铃，羽毛在月光下呈现淡蓝色光泽。性格高傲但忠诚，只认可真正强大的主人。",
            "毛茸茸的雪域灵狐，拥有三根蓬松的尾巴，每根尾巴末端都有一颗闪烁的冰珠。眼睛呈琥珀色，能在暴风雪中看清方向。喜欢在雪地里打滚，性格活泼调皮。"
        ]
    },
    forest: {
        name: "翡翠森林",
        description: "生机盎然的古老森林，木系灵宠的家园",
        icon: "fa-tree",
        pets: [
            "一只翠绿色的森林精灵，翅膀如树叶般透明，身体由藤蔓和花朵组成。它散发着淡淡的花香，能够与植物交流，引导森林的生长。性格温和善良，治愈系灵宠。",
            "体型小巧的橡果松鼠，毛皮呈深棕色，尾巴蓬松如羽毛。它的脸颊能储存魔力橡果，眼睛闪烁着智慧的光芒。行动敏捷，喜欢收集闪亮的小物件，性格机警好奇。",
            "神秘的森林守护者，鹿角上生长着发光的苔藓和花朵，四蹄踏过之处会绽放鲜花。眼睛如翡翠般碧绿，能看透森林中的一切秘密。性格庄严但温柔，保护着森林的平衡。"
        ]
    },
    volcano: {
        name: "熔岩火山",
        description: "炽热活跃的火山地带，火系灵宠在此诞生",
        icon: "fa-fire",
        pets: [
            "一只活泼的火焰蜥蜴，鳞片如熔岩般红黑相间，尾巴末端燃烧着永不熄灭的火焰。眼睛如燃烧的煤炭，能在岩浆中自由游动。性格热情奔放，有时会不小心点燃周围物品。",
            "威严的熔岩巨龟，背甲由冷却的火山岩构成，缝隙中透出橙红色的光芒。行动缓慢但力量巨大，喷吐的火焰能融化岩石。性格沉稳可靠，是值得信赖的伙伴。",
            "优雅的火凤凰雏鸟，羽毛如流动的火焰，飞行时洒下火星。鸣叫声清脆悦耳，能治愈同伴的灼伤。性格高贵但亲近主人，随着成长火焰会越来越旺盛。"
        ]
    }
};

// 显示指定步骤
function showStep(stepId) {
    // 隐藏所有步骤
    document.getElementById('region-selection').style.display = 'none';
    document.getElementById('pet-discovery').style.display = 'none';
    document.getElementById('naming-pet').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'none';
    
    // 显示当前步骤
    document.getElementById(stepId).style.display = stepId === 'chat-interface' ? 'flex' : 'block';
    gameState.currentStep = stepId;
}

// 获取随机回复
function getRandomResponse() {
    const responses = [
        "这个问题很有趣！作为灵宠，我可以告诉你很多关于灵界的事情。",
        "我有点饿了，主人能给我找点吃的吗？",
        "我感受到你今天的情绪很好，有什么开心的事要分享吗？",
        "在昆仑山脉时，我学会了如何控制冰雪之力，想看看我的能力吗？",
        "今天天气真好，适合一起出去探险！",
        "主人给我取的名字真好听，我太喜欢了！",
        "我感觉到附近有强大的灵力波动，可能有其他灵宠在附近。",
        "我的历练值提升了！感谢主人的陪伴和照顾。",
        "你是我遇到过最好的主人！我会一直守护你的。",
        "在灵宠世界里，我们通过心灵感应交流，就像我们现在这样。"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// 发送消息函数
function sendMessage() {
    const message = document.getElementById('user-input').value.trim();
    if (message) {
        // 添加用户消息
        const messages = document.getElementById('messages');
        const userMessage = document.createElement('div');
        userMessage.className = 'message user';
        userMessage.innerHTML = `
            <div class="avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="content">
                ${message}
            </div>
        `;
        messages.appendChild(userMessage);
        
        // 模拟AI回复
        setTimeout(() => {
            const aiMessage = document.createElement('div');
            aiMessage.className = 'message system';
            aiMessage.innerHTML = `
                <div class="avatar">
                    <i class="fas fa-dragon"></i>
                </div>
                <div class="content">
                    主人，${getRandomResponse()}
                </div>
            `;
            messages.appendChild(aiMessage);
            messages.scrollTop = messages.scrollHeight;
        }, 1000);
        
        // 清空输入框
        document.getElementById('user-input').value = '';
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    // 地域选择
    const regionCards = document.querySelectorAll('.region-card');
    const exploreBtn = document.getElementById('explore-btn');
    
    regionCards.forEach(card => {
        card.addEventListener('click', function() {
            // 移除之前的选择
            regionCards.forEach(c => c.classList.remove('selected'));
            
            // 设置当前选择
            this.classList.add('selected');
            const region = this.dataset.region;
            gameState.selectedRegion = region;
            
            // 启用探索按钮
            exploreBtn.disabled = false;
        });
    });
    
    // 开始探索
    exploreBtn.addEventListener('click', function() {
        showStep('pet-discovery');
        
        // 显示区域名称
        document.getElementById('region-name-display').textContent = 
            regionData[gameState.selectedRegion].name;
        
        // 随机选择一个宠物描述
        const pets = regionData[gameState.selectedRegion].pets;
        const randomPet = pets[Math.floor(Math.random() * pets.length)];
        document.getElementById('pet-description-text').textContent = randomPet;
        gameState.petDescription = randomPet;
    });
    
    // 尝试捕捉
    document.getElementById('catch-btn').addEventListener('click', function() {
        showStep('naming-pet');
    });
    
    // 命名确认
    document.getElementById('name-confirm-btn').addEventListener('click', function() {
        const nameInput = document.getElementById('pet-name-input');
        const petName = nameInput.value.trim();
        
        if (petName.length < 2 || petName.length > 12) {
            alert("请输入2-12个字符的灵宠名称");
            return;
        }
        
        gameState.petName = petName;
        
        // 显示生成指示器
        const generatingIndicator = document.getElementById('generating-indicator');
        generatingIndicator.style.display = 'block';
        
        // 更新聊天界面中的宠物名称
        document.getElementById('pet-name-display').textContent = petName;
        document.getElementById('chat-title').textContent = petName;
        document.getElementById('pet-name-chat').textContent = petName;
        
        // 模拟生成过程
        setTimeout(() => {
            // 显示聊天界面
            showStep('chat-interface');
            
            // 显示游戏头部
            document.querySelector('.game-header').style.display = 'flex';
            
            // 设置聊天背景（实际应用中替换为生成的宠物图像）
            document.querySelector('.chat-messages').style.backgroundImage = 
                "url('https://img.freepik.com/free-vector/cute-fox-with-cub-cartoon-vector-icon-illustration_138676-2247.jpg')";
            document.querySelector('.chat-messages').style.backgroundSize = 'cover';
            document.querySelector('.chat-messages').style.backgroundBlendMode = 'overlay';
        }, 3000);
    });
    
    // 发送消息
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if(e.key === 'Enter') {
            sendMessage();
        }
    });
});