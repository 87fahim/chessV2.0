import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

interface MoveConfirmationDialogProps {
  from: string;
  to: string;
  promotion?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const MoveConfirmationDialog: React.FC<MoveConfirmationDialogProps> = ({
  from,
  to,
  promotion,
  onConfirm,
  onCancel,
}) => (
  <Dialog open onClose={onCancel} fullWidth maxWidth="xs">
    <DialogTitle>Confirm Move</DialogTitle>
    <DialogContent>
      <Typography variant="body2">
        Play {from} to {to}
        {promotion ? ` and promote to ${promotion.toUpperCase()}` : ''}?
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button onClick={onConfirm} variant="contained">Confirm</Button>
    </DialogActions>
  </Dialog>
);

export default MoveConfirmationDialog;
