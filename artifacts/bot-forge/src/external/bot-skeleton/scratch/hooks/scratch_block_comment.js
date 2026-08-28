/**
 * Change the colour of the associated bubble to match its block.
 * deriv-bot: Use primary colour instead of tertiary. At time of writing
 * we use colour too similar to workspace background colour for tertiary (borders).
 * @package
 */
// Blockly 11 moved workspace comments under Blockly.comments and removed the
// private bubble_/block_ fields used by this legacy colour override. The
// default rendered comment styling is compatible with DBot, so only install
// the override when the old API is actually present.
const LegacyWorkspaceComment = window.Blockly.WorkspaceComment;

if (
    LegacyWorkspaceComment?.prototype?.isVisible &&
    LegacyWorkspaceComment.prototype.bubble_ &&
    LegacyWorkspaceComment.prototype.block_
) {
    LegacyWorkspaceComment.prototype.updateColour = function () {
        if (this.isVisible()) {
            this.bubble_.setColour(this.block_.getColour());
        }
    };
}
