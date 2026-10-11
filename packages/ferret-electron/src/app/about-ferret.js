const fs = require('fs');
const path = require('path');

const logoBase64 = fs.readFileSync(path.join(__dirname, '..', 'about', '256x256.png')).toString('base64');

module.exports = function aboutFerret({ version }) {
  const currentYear = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes">
        <title>About Ferret</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 0;
                padding: 10px;
                background-color: #f4f4f4;
                color: #333;
            }
            .logo {
                margin-top: 0px;
            }
            .title {
                font-size: 24px;
                margin-top: 5px;
                font-weight: bold;
                color: #222;
            }
            .description {
                font-size: 12px;
                color: #222;
                margin-top: 5px;
            }
            .buttons {
                margin-top: 5px;
            }
            .project {
                margin: 0;
                font-size: 14px;
                color: #555;
            }
            .footer {
                margin-top: 5px;
                padding: 5px;
                font-size: 14px;
                color: #555;
            }
        </style>
    </head>
    <body>
      <div class="logo">
        <img src="data:image/png;base64,${logoBase64}" width="100" height="100" alt="Ferret" />
      </div>
      <h2 class="title">Ferret ${version}</h2>
      <p class="project">github.com/ferretclient/ferret</p>
      <footer class="footer">
          ©${currentYear} Ferret
      </footer>
    </body>
    </html>
  `;
};
