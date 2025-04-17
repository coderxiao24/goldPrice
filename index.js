const express = require("express");
const path = require("path");
const open = require("open");
require("dotenv").config();

if (!process.env.API_TOKEN) {
  console.log("请在.env文件中设置环境变量API_TOKEN");
  return;
}

const { getGoldData } = require("./getGoldData");

const app = express();

// 设置静态文件夹为项目根目录
app.use(express.static(path.join(__dirname)));

// 如果没有匹配的静态资源，则返回404或其他响应
app.use((req, res) => {
  res.status(404).send("未找到该资源");
});

// 监听端口
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await getGoldData();

    // 获取本机IPv4地址
    // 获取服务器地址并构建URL
    const { networkInterfaces } = require("os");
    const ipAddress = Object.values(networkInterfaces() || {})
      .flat()
      .find((iface) => iface.family === "IPv4" && !iface.internal)?.address;

    const url = `http://${ipAddress || "localhost"}:${PORT}/public/index.html`;
    app.listen(PORT, () => {
      console.log(`服务器已启动，访问地址: ${url}`);
      open(url);
    });
  } catch (error) {
    console.error("服务器启动失败:", error.message);
    process.exit(1);
  }
}

start();
