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

    // 获取本机局域网IP地址
    const interfaces = require("os").networkInterfaces();
    let ipAddress = "127.0.0.1"; // 默认为回环地址
    for (let interfaceName in interfaces) {
      let iface = interfaces[interfaceName];
      for (let alias of iface) {
        if (alias.family === "IPv4" && !alias.internal) {
          ipAddress = alias.address;
          break;
        }
      }
    }

    app.listen(PORT, () => {
      const url = `http://${ipAddress}:${PORT}/public/index.html`;
      console.log(`服务器正在运行，访问地址: ${url}`);
      open(url);
    });
  } catch (error) {
    console.log(error);
  }
}

start();
