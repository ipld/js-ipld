#! /usr/bin/env node

// This script generates the table of packages you can see in the readme

// Columns to show at the header of the table
const columns = [
  'Package',
  'Version',
  'Deps',
  'CI',
  'Coverage'
]

// Headings are a string
// Arrays are packages. Index 0 is the GitHub repo and index 1 is the npm package
const rows = [
  'IPLD Formats',
  ['ipld/js-ipld-bitcoin', 'ipld-bitcoin'],
  ['ipld/js-ipld-dag-cbor', 'ipld-dag-cbor'],
  ['ipld/js-ipld-dag-pb', 'ipld-dag-pb'],
  ['ipld/js-ipld-ethereum', 'ipld-ethereum'],
  ['ipld/js-ipld-git', 'ipld-git'],
  ['ipld/js-ipld-raw', 'ipld-raw'],
  ['ipld/js-ipld-zcash', 'ipld-zcash'],

  'Storage',
  ['multiformats/js-multihash', 'multihashes'],
  ['ipfs/js-ipfs-block', 'ipfs-block'],
  ['ipfs/js-ipfs-repo', 'ipfs-repo'],
  ['ipfs/interface-datastore', 'interface-datastore'],

  'Exchange',
  ['ipfs/js-ipfs-block-service', 'ipfs-block-service'],

  'Generics/Utils',
  ['ipfs/is-ipfs', 'is-ipfs'],
]

const isItemPackage = (item) => {
  return Array.isArray(item)
}

const packageBadges = [
  // Package
  (gh, npm) => `[\`${npm}\`](//github.com/${gh})`,
  // Version
  (gh, npm) => `[![npm](https://img.shields.io/npm/v/${npm}.svg?maxAge=86400&style=flat-square)](//github.com/${gh}/releases)`,
  // Deps
  (gh, npm) => `[![Deps](https://david-dm.org/${gh}.svg?style=flat-square)](https://david-dm.org/${gh})`,
  // CI
  (gh, npm) => {
    // Need to fix the path for jenkins links, as jenkins adds `/job/` between everything
    const jenkinsPath = gh.split('/').join('/job/')
    return `[![jenkins](https://ci.ipfs.team/buildStatus/icon?job=${gh}/master)](https://ci.ipfs.team/job/${jenkinsPath}/job/master/)`
  },
  // Coverage
  (gh, npm) => `[![codecov](https://codecov.io/gh/${gh}/branch/master/graph/badge.svg)](https://codecov.io/gh/${gh})`
]

// Creates the table row for a package
const generatePackageRow = (item) => {
  const row = packageBadges.map((func) => {
    // First string is GitHub path, second is npm package name
    return func(item[0], item[1])
  }).join(' | ')
  const fullRow = `| ${row} |`
  return fullRow
}

// Generates a row for the table, depending if it's a package or a heading
const generateRow = (item) => {
  if (isItemPackage(item)) {
    return generatePackageRow(item)
  } else {
    return `| **${item}** |`
  }
}

const header = `| ${columns.join(' | ')} |`
const hr = `| ${columns.map(() => '---------').join('|')} |`

const toPrint = [
  header,
  hr,
  rows.map((row) => generateRow(row)).join('\n')
]

toPrint.forEach((t) => console.log(t))
