// Validate skill tree structure
const fs = require('fs');
const path = require('path');

const treeFile = path.join(__dirname, '..', 'data', 'generated', 'poe2_skill_tree_large.json');
const data = JSON.parse(fs.readFileSync(treeFile, 'utf8'));

console.log('🔍 Validating tree structure...\n');

// Check for orphaned nodes
const nodeIds = new Set(data.nodes.map(n => n.id));
const edgeNodes = new Set();
data.edges.forEach(([from, to]) => {
  edgeNodes.add(from);
  edgeNodes.add(to);
});

const orphaned = Array.from(nodeIds).filter(id => id !== 'start' && !edgeNodes.has(id));
console.log('Orphaned nodes (not connected):', orphaned.length);
if (orphaned.length > 0 && orphaned.length < 20) {
  console.log('  Examples:', orphaned.slice(0, 10));
}

// Check for nodes referenced in edges that don't exist
const invalidEdges = data.edges.filter(([from, to]) => !nodeIds.has(from) || !nodeIds.has(to));
console.log('Invalid edges (reference non-existent nodes):', invalidEdges.length);
if (invalidEdges.length > 0 && invalidEdges.length < 20) {
  console.log('  Examples:', invalidEdges.slice(0, 10));
}

// Check keystones
const keystones = data.nodes.filter(n => n.type === 'keystone');
console.log('\n🔑 Keystones found:', keystones.length);
keystones.forEach(k => console.log('  -', k.name, '(' + k.id + ')'));

// Check node distribution
console.log('\n📊 Node type distribution:');
const types = {};
data.nodes.forEach(n => types[n.type] = (types[n.type] || 0) + 1);
Object.entries(types).forEach(([type, count]) => console.log('  ', type + ':', count));

// Check connectivity from start node
console.log('\n🔗 Connectivity check from start node...');
const visited = new Set(['start']);
const queue = ['start'];
const edgeMap = new Map();

data.edges.forEach(([from, to]) => {
  if (!edgeMap.has(from)) edgeMap.set(from, []);
  if (!edgeMap.has(to)) edgeMap.set(to, []);
  edgeMap.get(from).push(to);
  edgeMap.get(to).push(from);
});

while (queue.length > 0) {
  const current = queue.shift();
  const neighbors = edgeMap.get(current) || [];
  neighbors.forEach(neighbor => {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);
    }
  });
}

const reachable = visited.size;
const total = data.nodes.length;
console.log('  Reachable from start:', reachable, '/', total);
console.log('  Unreachable:', total - reachable);

if (total - reachable > 0) {
  const unreachable = data.nodes.filter(n => !visited.has(n.id));
  console.log('\n⚠️ First 20 unreachable nodes:');
  unreachable.slice(0, 20).forEach(n => console.log('    -', n.id, '(' + n.name + ')'));
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📋 VALIDATION SUMMARY');
console.log('='.repeat(60));

const issues = [];
if (orphaned.length > 0) issues.push(`${orphaned.length} orphaned nodes`);
if (invalidEdges.length > 0) issues.push(`${invalidEdges.length} invalid edges`);
if (total - reachable > 0) issues.push(`${total - reachable} unreachable nodes`);

if (issues.length === 0) {
  console.log('✅ Tree structure is VALID!');
  console.log('   All', total, 'nodes are properly connected and reachable.');
} else {
  console.log('❌ Tree structure has ISSUES:');
  issues.forEach(issue => console.log('   -', issue));
  console.log('\n⚠️ Tree may not work correctly in game!');
}

console.log('='.repeat(60));
