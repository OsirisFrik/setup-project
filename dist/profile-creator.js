import { createInterface } from 'readline';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getProfilePath, getProfilesDir, ensureProfilesDir } from "./utils/paths.js";
import { loadProfile } from "./profiles/loader.js";
async function prompt(question) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
export async function createProfileInteractive() {
    console.log('\n📋 Create New Profile\n');
    const id = await prompt('Profile ID (e.g., react-base): ');
    if (!id)
        throw new Error('Profile ID is required');
    const name = await prompt('Profile name (e.g., React Base Setup): ');
    if (!name)
        throw new Error('Profile name is required');
    const description = await prompt('Description: ');
    const version = await prompt('Version (default: 1.0.0): ') || '1.0.0';
    const inheritsRaw = await prompt('Inherit from another profile? (leave blank for none): ');
    const inherits = inheritsRaw || undefined;
    const profile = {
        id,
        name,
        description,
        version,
        inherits,
        dependencies: {
            prod: [],
            dev: [],
        },
        files: {},
        steps: [],
    };
    const prodDeps = await prompt('Production dependencies (comma-separated, or blank): ');
    if (prodDeps) {
        profile.dependencies.prod = prodDeps
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    const devDeps = await prompt('Dev dependencies (comma-separated, or blank): ');
    if (devDeps) {
        profile.dependencies.dev = devDeps
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    ensureProfilesDir();
    const profilePath = getProfilePath(id);
    mkdirSync(profilePath, { recursive: true });
    mkdirSync(join(profilePath, 'templates'), { recursive: true });
    const profileJsonPath = join(profilePath, 'profile.json');
    writeFileSync(profileJsonPath, JSON.stringify(profile, null, 2), 'utf-8');
    console.log(`\n✓ Profile '${id}' created successfully`);
    console.log(`  Location: ${profilePath}`);
    console.log(`  Templates: ${join(profilePath, 'templates')}`);
}
export async function editProfile(profileId) {
    const profile = loadProfile(profileId);
    console.log(`\n📝 Edit Profile: ${profileId}\n`);
    console.log('Current profile:');
    console.log(JSON.stringify(profile, null, 2));
    const shouldEditDeps = await prompt('\nEdit dependencies? (y/n): ');
    if (shouldEditDeps.toLowerCase() === 'y') {
        const prodDeps = await prompt('Production dependencies (comma-separated): ');
        if (prodDeps) {
            profile.dependencies.prod = prodDeps
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        }
        const devDeps = await prompt('Dev dependencies (comma-separated): ');
        if (devDeps) {
            profile.dependencies.dev = devDeps
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        }
    }
    const profilePath = getProfilePath(profileId);
    const profileJsonPath = join(profilePath, 'profile.json');
    writeFileSync(profileJsonPath, JSON.stringify(profile, null, 2), 'utf-8');
    console.log(`\n✓ Profile '${profileId}' updated`);
}
export async function deleteProfile(profileId) {
    const profilePath = getProfilePath(profileId);
    if (!existsSync(profilePath)) {
        throw new Error(`Profile not found: ${profileId}`);
    }
    const confirm = await prompt(`⚠ Are you sure you want to delete '${profileId}'? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
        console.log('Cancelled');
        return;
    }
    rmSync(profilePath, { recursive: true, force: true });
    console.log(`✓ Profile '${profileId}' deleted`);
}
