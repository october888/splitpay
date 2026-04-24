import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { useAccount, useCreateSplit as useWeb3CreateSplit, ConnectButton, useUsdcBalance, formatUsdcDisplay, parseUsdc } from "@/lib/web3";
import { useCreateSplit as useRegisterSplit } from "@workspace/api-client-react";
import { SplitType } from "@workspace/api-client-react";

const equalSchema = z.object({
  title: z.string().max(120).optional(),
  totalAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
  participantCount: z.number().int().min(1).max(100),
});

const customSchema = z.object({
  title: z.string().max(120).optional(),
  totalAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
  customAmounts: z.array(z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Invalid amount")).min(1).max(100),
}).refine((data) => {
  const total = Number(data.totalAmount);
  const sum = data.customAmounts.reduce((acc, val) => acc + Number(val), 0);
  return Math.abs(total - sum) < 0.000001; // floating point tolerance
}, {
  message: "Sum of custom amounts must equal total amount",
  path: ["customAmounts"],
});

export default function CreateSplit() {
  const [, setLocation] = useLocation();
  const { address, isConnected } = useAccount();
  const { data: balance } = useUsdcBalance(address);
  const { create: createOnChain, isPending: isCreatingOnChain } = useWeb3CreateSplit();
  const registerSplit = useRegisterSplit();

  const [mode, setMode] = useState<"equal" | "custom">("equal");
  
  const formEqual = useForm<z.infer<typeof equalSchema>>({
    resolver: zodResolver(equalSchema),
    defaultValues: { title: "", totalAmount: "", participantCount: 2 },
  });

  const formCustom = useForm<z.infer<typeof customSchema>>({
    resolver: zodResolver(customSchema),
    defaultValues: { title: "", totalAmount: "", customAmounts: ["", ""] },
  });

  const customAmounts = formCustom.watch("customAmounts");
  const customTotal = formCustom.watch("totalAmount");
  
  const customSum = useMemo(() => {
    return customAmounts.reduce((acc, val) => acc + (Number(val) || 0), 0);
  }, [customAmounts]);

  const isPending = isCreatingOnChain || registerSplit.isPending;

  const onSubmitEqual = async (values: z.infer<typeof equalSchema>) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      const totalMicro = parseUsdc(values.totalAmount);
      
      const { onChainId, txHash } = await createOnChain({
        totalAmount: totalMicro,
        participantCount: values.participantCount,
        splitType: "equal",
        title: values.title || "",
      });

      const registered = await registerSplit.mutateAsync({
        data: {
          creatorAddress: address,
          onChainId: onChainId.toString(),
          totalAmount: totalMicro.toString(),
          participantCount: values.participantCount,
          splitType: SplitType.equal,
          txHash,
          title: values.title,
        }
      });

      toast.success("Split created successfully!");
      setLocation(`/split/${registered.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create split: " + (err.message || "Unknown error"));
    }
  };

  const onSubmitCustom = async (values: z.infer<typeof customSchema>) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      const totalMicro = parseUsdc(values.totalAmount);
      const customMicros = values.customAmounts.map(a => parseUsdc(a).toString());
      
      const { onChainId, txHash } = await createOnChain({
        totalAmount: totalMicro,
        participantCount: values.customAmounts.length,
        splitType: "custom",
        title: values.title || "",
      });

      const registered = await registerSplit.mutateAsync({
        data: {
          creatorAddress: address,
          onChainId: onChainId.toString(),
          totalAmount: totalMicro.toString(),
          participantCount: values.customAmounts.length,
          splitType: SplitType.custom,
          customAmounts: customMicros,
          txHash,
          title: values.title,
        }
      });

      toast.success("Split created successfully!");
      setLocation(`/split/${registered.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create split: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create a split</h1>
        <p className="text-muted-foreground">Setup a new bill split on Arc Network.</p>
      </div>

      {!isConnected ? (
        <Card className="bg-white/[0.02] border-white/5 text-center py-12">
          <CardContent className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-muted-foreground">
              <Wallet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect your wallet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              You need to connect your wallet to deploy a split contract on Arc Network.
            </p>
            <ConnectButton />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white/[0.02] border-white/10 shadow-xl overflow-hidden">
          <div className="bg-white/5 border-b border-white/5 p-4 flex items-center justify-between text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Connected
            </div>
            {balance !== undefined && (
              <div className="font-medium text-foreground">
                Balance: {formatUsdcDisplay(balance, { withSymbol: true })}
              </div>
            )}
          </div>
          
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <div className="p-6 pb-0">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5">
                <TabsTrigger value="equal">Equal Split</TabsTrigger>
                <TabsTrigger value="custom">Custom Amounts</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="equal" className="m-0">
              <Form {...formEqual}>
                <form onSubmit={formEqual.handleSubmit(onSubmitEqual)} className="p-6 space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={formEqual.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Dinner at Dorsia" className="bg-white/5 border-white/10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={formEqual.control}
                        name="totalAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Amount (USDC)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                <Input placeholder="0.00" type="number" step="any" className="pl-7 bg-white/5 border-white/10 font-mono text-lg" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={formEqual.control}
                        name="participantCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of People</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" max="100" 
                                className="bg-white/5 border-white/10 font-mono text-lg" 
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value))} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {formEqual.watch("totalAmount") && formEqual.watch("participantCount") > 0 && (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 flex items-center justify-between text-primary">
                      <span className="font-medium">Per person share</span>
                      <span className="font-bold text-xl font-mono">
                        ~{(Number(formEqual.watch("totalAmount")) / formEqual.watch("participantCount")).toFixed(2)} USDC
                      </span>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isPending}>
                    {isPending ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating on-chain...</>
                    ) : (
                      "Create Split"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="custom" className="m-0">
              <Form {...formCustom}>
                <form onSubmit={formCustom.handleSubmit(onSubmitCustom)} className="p-6 space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={formCustom.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Weekend Trip" className="bg-white/5 border-white/10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formCustom.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Amount (USDC)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                              <Input placeholder="0.00" type="number" step="any" className="pl-7 bg-white/5 border-white/10 font-mono text-lg" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <Label>Participant Shares</Label>
                      <div className={`text-sm font-medium ${Math.abs(Number(customTotal) - customSum) > 0.000001 ? 'text-destructive' : 'text-primary'}`}>
                        Sum: {customSum.toFixed(2)} / {Number(customTotal || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <AnimatePresence>
                        {customAmounts.map((_, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-8 h-10 flex items-center justify-center text-sm font-medium text-muted-foreground bg-white/5 rounded-md border border-white/5">
                              #{index + 1}
                            </div>
                            <FormField
                              control={formCustom.control}
                              name={`customAmounts.${index}`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input 
                                      placeholder="0.00" 
                                      type="number" 
                                      step="any" 
                                      className="bg-white/5 border-white/10 font-mono" 
                                      {...field} 
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                const newAmounts = [...customAmounts];
                                newAmounts.splice(index, 1);
                                formCustom.setValue("customAmounts", newAmounts);
                              }}
                              disabled={customAmounts.length <= 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full border-dashed border-white/20 bg-transparent hover:bg-white/5"
                      onClick={() => {
                        if (customAmounts.length < 100) {
                          formCustom.setValue("customAmounts", [...customAmounts, ""]);
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Person
                    </Button>
                    
                    {formCustom.formState.errors.customAmounts?.root && (
                      <p className="text-sm font-medium text-destructive mt-2">
                        {formCustom.formState.errors.customAmounts.root.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-semibold mt-4" disabled={isPending}>
                    {isPending ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating on-chain...</>
                    ) : (
                      "Create Split"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}
