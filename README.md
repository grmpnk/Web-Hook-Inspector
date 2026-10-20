<p align="center">
  <img src="icon.svg" width="128" alt="Web-Hook-Inspector">
</p>
<h1 align="center">
  <a href="https://github.com/grmpnk/Web-Hook-Inspector/raw/refs/heads/main/userscript.user.js">
    Web Hook Inspector
  </a>
</h1>
<p align="center">
  This userscript is a tool for hooking, inspecting, and overriding JavaScript functions and variables used on websites.
</p>

<h2>Features</h2>

<ol>
  <li>Functions Tab
    <ul>
      <li>Hooks all functions on the <code>window object</code></li>
      <li><b>Original</b> shows site-specific functions.</li>
    </ul>
  </li>

  <li>Properties Tab
    <ul>
      <li>Hooks all properties inherited from <code>window</code>, <code>Object.prototype</code>, <code>Array.prototype</code>, and <code>Function.prototype</code>.</li>
    </ul>
  </li>

  <li>Globals Tab
    <ul>
      <li>Displays all variables, objects, and arrays in the <code>window object.</code></li>
      <li>When you click a name in the table, that action is logged in the DevTools console.</li>
    </ul>
  </li>

  <li>Custom Tab
    <ul>
      <li>allows you to add your own entries to the <code>Functions</code> and <code>Properties</code> tabs.</li>
    </ul>
  </li>

  <li>Overrides Tab
    <ul>
      <li>Allows you to override hooked <code>functions</code> and <code>properties</code>.</li>
      <li><code>Copy Button:</code> Copies the hook and override code as a ready-to-use snippet. Simply paste it into a new userscript and run it. If the target has not been hooked successfully, the operation will fail.</li>
      <li><code>JSON Button:</code> Saves the selected overrides as a JSON file.</li>
    </ul>
  </li>

  <li>Manage Tab
    <ul>
      <li>Manage JSON files. “fn” will be added to “Functions,” “prop” to “Properties,” and “override” to “Overrides.”</li>
    </ul>
  </li>

  <li>Fotter
    <ul>
      <li><code>Export Button:</code> Saves all stored values as a JSON file.</li>
    </ul>
  </li>
</ol>

<br>

<h2>Installation</h2>

<ol>
  <li>
    <strong>Install Tampermonkey</strong>
    <ul>
      <li>
        Chrome:
        <a href="https://chromewebstore.google.com/detail/tampermonkey-%E3%83%99%E3%83%BC%E3%82%BF%E7%89%88/gcalenpjmijncebpfijmoaglllgpjagf">
          Tampermonkey
        </a>
      </li>
      <li>
        Firefox:
        <a href="https://addons.mozilla.org/ja/firefox/addon/tampermonkey/">
          Tampermonkey
        </a>
      </li>
    </ul>
  </li>

  <li>
    <strong>Allow userscript</strong><br>
    Enable "Allow User Scripts" in the Extensions settings.
    For more details, see the official
    <a href="https://www.tampermonkey.net/faq.php?locale=en&q=Q209">
      FAQ
    </a>.
  </li>

  <li>
    <strong>Install Web-Hook-Inspector</strong><br>
    Install it
    <a href="https://github.com/grmpnk/Web-Hook-Inspector/raw/refs/heads/main/userscript.user.js">
      here
    </a>.
  </li>
</ol>
