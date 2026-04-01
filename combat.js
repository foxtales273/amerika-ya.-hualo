import pathfinderPkg from 'mineflayer-pathfinder';

const { goals } = pathfinderPkg;

class CombatManager {
    constructor(bot, inventoryManager) {
        this.bot = bot;
        this.inventoryManager = inventoryManager;
        this.isInCombat = false;
        this.target = null;
        this.preferredWeapons = {
            melee: ['netherite_sword', 'diamond_sword', 'iron_sword', 'stone_sword', 'wooden_sword',
                   'netherite_axe', 'diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe'],
            ranged: ['bow', 'crossbow'],
            shield: ['shield']
        };
        this.armorSlots = {
            head: ['netherite_helmet', 'diamond_helmet', 'iron_helmet', 'chainmail_helmet', 'leather_helmet'],
            chest: ['netherite_chestplate', 'diamond_chestplate', 'iron_chestplate', 'chainmail_chestplate', 'leather_chestplate'],
            legs: ['netherite_leggings', 'diamond_leggings', 'iron_leggings', 'chainmail_leggings', 'leather_leggings'],
            feet: ['netherite_boots', 'diamond_boots', 'iron_boots', 'chainmail_boots', 'leather_boots']
        };

        // Initialize combat behavior
        this.initializeCombat();
    }

    initializeCombat() {
        // Monitor for potential threats
        this.bot.on('physicsTick', () => {
            if (!this.isInCombat) {
                this.scanForThreats();
            } else {
                this.updateCombat();
            }
        });

        // Monitor for damage taken
        this.bot.on('hurt', (entity) => {
            if (!this.isInCombat) {
                const attacker = this.bot.entities[entity.hurtBy];
                if (attacker && this.isValidTarget(attacker)) {
                    this.engageTarget(attacker);
                }
            }
        });
    }

    async equipBestGear() {
        // Equip best armor
        for (const [slot, options] of Object.entries(this.armorSlots)) {
            for (const armorPiece of options) {
                const armor = this.bot.inventory.items().find(item => item.name === armorPiece);
                if (armor) {
                    try {
                        await this.bot.equip(armor, slot);
                        break;
                    } catch (err) {
                        console.log(`Failed to equip ${armorPiece}`);
                    }
                }
            }
        }

        // Equip weapon and shield
        await this.equipBestWeapon();
        await this.equipShield();
    }

    async equipBestWeapon() {
        for (const weapon of this.preferredWeapons.melee) {
            const item = this.bot.inventory.items().find(item => item.name === weapon);
            if (item) {
                try {
                    await this.bot.equip(item, 'hand');
                    return true;
                } catch (err) {
                    console.log(`Failed to equip ${weapon}`);
                }
            }
        }
        return false;
    }

    async equipBow() {
        for (const rangedWeapon of this.preferredWeapons.ranged) {
            const bow = this.bot.inventory.items().find(item => item.name === rangedWeapon);
            if (bow) {
                try {
                    await this.bot.equip(bow, 'hand');
                    // Check for arrows
                    const arrows = this.bot.inventory.items().find(item => item.name === 'arrow');
                    if (arrows) {
                        return true;
                    }
                } catch (err) {
                    console.log(`Failed to equip ${rangedWeapon}`);
                }
            }
        }
        return false;
    }

    async equipShield() {
        const shield = this.bot.inventory.items().find(item => item.name === 'shield');
        if (shield) {
            try {
                await this.bot.equip(shield, 'off-hand');
                return true;
            } catch (err) {
                console.log('Failed to equip shield');
            }
        }
        return false;
    }

    scanForThreats() {
        // Find nearest hostile mob or player
        const entity = this.bot.nearestEntity(entity => this.isValidTarget(entity));
        if (entity && this.bot.entity.position.distanceTo(entity.position) < 16) {
            this.engageTarget(entity);
        }
    }

    isValidTarget(entity) {
        if (!entity) return false;

        const hostileMobs = [
            'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
            'witch', 'slime', 'magma_cube', 'blaze', 'ghast'
        ];

        return (
            (entity.type === 'mob' && hostileMobs.includes(entity.name)) ||
            (entity.type === 'player' && entity.username !== this.bot.username && this.isPlayerHostile(entity))
        );
    }

    isPlayerHostile(player) {
        // Consider a player hostile if they're holding a weapon
        const heldItem = player.heldItem;
        if (!heldItem) return false;

        const weapons = [...this.preferredWeapons.melee, ...this.preferredWeapons.ranged];
        return weapons.includes(heldItem.name);
    }

    async engageTarget(target) {
        this.isInCombat = true;
        this.target = target;
        this.bot.chat(`Engaging hostile ${target.name}!`);

        // Equip combat gear
        await this.equipBestGear();

        // Start combat loop
        this.updateCombat();
    }

    async updateCombat() {
        if (!this.target || !this.target.isValid || this.target.health <= 0) {
            this.endCombat();
            return;
        }

        const distance = this.bot.entity.position.distanceTo(this.target.position);

        // Use bow if we have one and target is far
        if (distance > 5 && await this.equipBow()) {
            await this.performRangedAttack();
        } else {
            // Close combat
            await this.performMeleeAttack();
        }

        // Check health and retreat if needed
        if (this.bot.health < 7) {
            await this.tacticalRetreat();
        }
    }

    async performMeleeAttack() {
        const distance = this.bot.entity.position.distanceTo(this.target.position);
        
        if (distance > 3) {
            // Move closer to target
            this.bot.pathfinder.setGoal(new goals.GoalNear(
                this.target.position.x,
                this.target.position.y,
                this.target.position.z,
                2
            ));
        } else {
            // Attack pattern: shield up, attack, shield up
            await this.equipShield();
            await this.bot.waitForTicks(5);
            await this.equipBestWeapon();
            this.bot.lookAt(this.target.position.offset(0, this.target.height, 0));
            this.bot.attack(this.target);
            await this.bot.waitForTicks(5);
            await this.equipShield();
        }
    }

    async performRangedAttack() {
        // Aim slightly above target for arrow arc
        const targetPos = this.target.position.offset(0, this.target.height * 0.8, 0);
        this.bot.lookAt(targetPos);

        // Check if we have arrows
        const arrows = this.bot.inventory.items().find(item => item.name === 'arrow');
        if (!arrows) {
            await this.equipBestWeapon();
            return;
        }

        try {
            // Start charging bow
            await this.bot.activateItem();
            await this.bot.waitForTicks(20); // Full charge
            
            // Double check aim before release
            this.bot.lookAt(targetPos);
            await this.bot.waitForTicks(2);
            
            // Release arrow
            await this.bot.deactivateItem();
        } catch (err) {
            console.log('Failed to use bow');
        }
    }

    async tacticalRetreat() {
        this.bot.chat("Tactical retreat!");
        
        // Try to find a safe position
        const retreatVector = this.bot.entity.position.minus(this.target.position).normalize();
        const retreatPosition = this.bot.entity.position.plus(retreatVector.scaled(10));

        // Move to retreat position while keeping shield up
        await this.equipShield();
        
        // If health is critically low, use shelter strategy
        if (this.bot.health < 6) {
            await this.bot.healthManager.tacticalRetreatAndHeal();
            
            // Re-equip combat gear
            await this.equipBestGear();
            return;
        }

        // Otherwise, just retreat to a safe distance
        this.bot.pathfinder.setGoal(new goals.GoalNear(
            retreatPosition.x,
            retreatPosition.y,
            retreatPosition.z,
            2
        ));

        // End combat if we successfully retreat
        if (this.bot.entity.position.distanceTo(this.target.position) > 15) {
            this.endCombat();
        }
    }

    endCombat() {
        this.isInCombat = false;
        this.target = null;
        this.bot.pathfinder.setGoal(null);
        this.bot.chat("Combat ended");
    }
}

export default CombatManager;