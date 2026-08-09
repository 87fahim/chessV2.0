import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmColor?: 'primary' | 'error';
  onCancel: () => void;
  onConfirm: () => void;
}

/** Small responsive confirmation dialog used for resign and rematch prompts. */
const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmColor = 'primary',
  onCancel,
  onConfirm,
}) => (
  <Dialog
    open={open}
    onClose={onCancel}
    fullWidth
    maxWidth="xs"
    slotProps={{
      paper: {
        sx: {
          width: { xs: 'calc(100% - 16px)', sm: '100%' },
          m: { xs: 1, sm: 2 },
        },
      },
    }}
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent sx={{ overflowX: 'hidden' }}>
      <Typography>{message}</Typography>
    </DialogContent>
    <DialogActions sx={{ gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, '& > :not(style)': { ml: 0 } }}>
      <Button onClick={onCancel} sx={{ width: { xs: '100%', sm: 'auto' } }}>{cancelLabel}</Button>
      <Button color={confirmColor} variant="contained" onClick={onConfirm} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmActionDialog;
