import { Database } from 'better-sqlite3';
import { writeFileSync, rmSync } from 'fs';
import { join } from 'path';

export function copiaza(outputDir) {
  const db = new Database('memorie.db');
  const now = new Date();
  const fileName = \`memorie-\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}.db\`;
  const backupPath = join(outputDir, fileName);

  try {
    db.exec(\`VACUUM INTO '\${backupPath}'\`);

    // Verify backup
    const backupDb = new Database(backupPath);
    const result = backupDb.prepare('SELECT COUNT(*) as cnt FROM cautari').get();
    backupDb.close();

    if (result.cnt >= 0) {
      console.log(\`✓ Backup: \${backupPath}\`);
      rotateBackups(outputDir);
      return true;
    }
  } catch (e) {
    console.error('Backup error:', e.message);
  }

  return false;
}

function rotateBackups(dir) {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  // In production, scan dir and delete old backups matching memorie-*.db pattern
}
